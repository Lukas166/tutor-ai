const DEFAULT_BUCKET = "course-materials";

type UploadFileInput = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  courseId: string;
  sessionId: string;
};

type UploadFileResult = {
  fileName: string;
  publicUrl: string;
  storagePath: string;
};

function getStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Konfigurasi Supabase Storage belum lengkap. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "material.pdf";
}

function encodeStoragePath(storagePath: string) {
  return storagePath.split("/").map(encodeURIComponent).join("/");
}

export async function uploadMaterialFileToSupabase({
  buffer,
  contentType,
  fileName,
  courseId,
  sessionId,
}: UploadFileInput): Promise<UploadFileResult> {
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();
  const safeFileName = `${Date.now()}-${sanitizeFileName(fileName)}`;
  const storagePath = `${courseId}/${sessionId}/${crypto.randomUUID()}-${safeFileName}`;
  const encodedPath = encodeStoragePath(storagePath);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`;
  const uploadBody = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType || "application/pdf",
      "x-upsert": "false",
    },
    body: uploadBody,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gagal upload ke Supabase Storage: ${message || response.statusText}`);
  }

  return {
    fileName,
    storagePath,
    publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`,
  };
}

export async function downloadMaterialFileFromSupabase(storagePath: string): Promise<Buffer> {
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageConfig();
  const encodedPath = encodeStoragePath(storagePath);
  const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`;

  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gagal membaca file dari Supabase Storage: ${message || response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
