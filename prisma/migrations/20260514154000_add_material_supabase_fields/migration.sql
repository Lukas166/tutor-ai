ALTER TABLE "material"
ADD COLUMN "materialType" TEXT NOT NULL DEFAULT 'file',
ADD COLUMN "description" TEXT,
ADD COLUMN "storagePath" TEXT,
ADD COLUMN "publicUrl" TEXT,
ADD COLUMN "externalUrl" TEXT,
ADD COLUMN "textContent" TEXT;

UPDATE "material"
SET
  "materialType" = CASE
    WHEN "filePath" LIKE 'link:%' OR "filePath" LIKE 'http%' THEN 'link'
    WHEN "filePath" LIKE 'text:%' THEN 'text'
    ELSE 'file'
  END,
  "externalUrl" = CASE
    WHEN "filePath" LIKE 'link:%' THEN substring("filePath" FROM 6)
    WHEN "filePath" LIKE 'http%' THEN "filePath"
    ELSE NULL
  END,
  "textContent" = CASE
    WHEN "filePath" LIKE 'text:%' THEN substring("filePath" FROM 6)
    ELSE NULL
  END,
  "storagePath" = CASE
    WHEN "filePath" NOT LIKE 'link:%' AND "filePath" NOT LIKE 'text:%' THEN "filePath"
    ELSE NULL
  END,
  "publicUrl" = CASE
    WHEN "filePath" NOT LIKE 'link:%' AND "filePath" NOT LIKE 'text:%' THEN "filePath"
    ELSE NULL
  END;
