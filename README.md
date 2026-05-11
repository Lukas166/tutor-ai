# TUTOR AI: Mini LMS Berbasis AI Personalisasi dengan RAG

## Deskripsi Proyek
Tutor AI adalah sistem Manajemen Pembelajaran (LMS) inovatif yang mengintegrasikan teknologi Artificial Intelligence (AI) berbasis Retrieval-Augmented Generation (RAG). Sistem ini dirancang untuk memberikan pengalaman belajar yang personal, interaktif, dan adaptif bagi mahasiswa dengan memanfaatkan materi perkuliahan sebagai basis pengetahuan utama bagi tutor cerdas.

## Latar Belakang
Keterbatasan akses interaksi dengan dosen di luar jam kuliah seringkali menghambat pemahaman mendalam mahasiswa terhadap materi. Tutor AI hadir untuk menjembatani celah tersebut dengan menyediakan tutor virtual yang mampu memberikan penjelasan kontekstual berdasarkan materi PDF yang diunggah oleh dosen, serta menyesuaikan gaya komunikasi berdasarkan jenjang pendidikan mahasiswa.

## Tujuan Utama
1. Membangun infrastruktur Mini LMS yang terintegrasi dengan mesin AI.
2. Mengimplementasikan sistem RAG untuk pemrosesan materi PDF menjadi basis pengetahuan tutor.
3. Menyediakan pengalaman belajar yang dipersonalisasi sesuai profil mahasiswa.
4. Meningkatkan interaktivitas melalui fitur multimodal (Teks dan Suara).
5. Menyederhanakan pengelolaan materi bagi dosen dan administrasi sistem bagi admin.

## Fitur Utama

### 1. Mini Learning Management System (LMS)
- Manajemen Mata Kuliah: Pengelolaan kursus secara terstruktur.
- Sistem Pendaftaran: Pendaftaran mandiri mahasiswa menggunakan Enrollment Key.
- Pembelajaran Berbasis Sesi: Pengaturan materi per topik atau per minggu.
- Manajemen File: Pengunggahan dan pengelolaan dokumen PDF sebagai referensi.

### 2. AI Tutor Berbasis RAG (Retrieval-Augmented Generation)
- Pemrosesan Dokumen: Chunking, embedding, dan penyimpanan ke Vector Database.
- Jawaban Kontekstual: AI memberikan jawaban yang bersumber langsung dari materi PDF yang diunggah, bukan hanya pengetahuan umum LLM.
- Akurasi Tinggi: Mengurangi risiko halusinasi AI dengan membatasi ruang lingkup jawaban pada materi perkuliahan.

### 3. Personalisasi AI Tutor
Sistem menyesuaikan gaya bahasa dan kedalaman penjelasan berdasarkan kategori mahasiswa:
- S1 (Sarjana): Penjelasan sederhana, menggunakan banyak analogi, dan mudah dipahami.
- S2 (Magister): Penjelasan lebih teknis, analitis, dan berfokus pada implementasi.
- S3 (Doktor): Penjelasan akademis mendalam, formal, dan berorientasi pada riset.

### 4. Interaksi Multimodal (Voice & Text)
- Speech-to-Text (STT): Input pertanyaan mahasiswa melalui suara.
- Text-to-Speech (TTS): Output jawaban AI dalam bentuk suara.
- AI Avatar Integration: Sinkronisasi audio dengan avatar virtual untuk pengalaman tutor yang lebih nyata.

## Ruang Lingkup Pengguna

### Mahasiswa
- Mencari mata kuliah berdasarkan nama atau dosen pengampu.
- Mengakses materi dan file PDF dalam "My Courses".
- Berinteraksi dengan Tutor AI menggunakan teks atau suara.
- Mendapatkan jawaban yang disesuaikan dengan jenjang pendidikan (S1/S2/S3).

### Dosen
- Membuat dan mengelola mata kuliah beserta deskripsinya.
- Mengunggah materi PDF yang secara otomatis diproses ke dalam Vector DB.
- Mengelola visibilitas materi (Aktivasi/Non-aktivasi sesi).
- Mengatur struktur pembelajaran per sesi.

### Admin
- Manajemen Pengguna (CRUD): Menambah, menghapus, dan mengedit data user.
- Manajemen Mata Kuliah: Membuat kursus dan menugaskan dosen pengampu.
- Monitoring Sistem: Pengawasan menyeluruh terhadap aktivitas kursus dan pengguna.

## Arsitektur Sistem

### Teknologi Frontend
- Framework: Next.js
- UI: Dashboard Responsif, Chat Interface, Course Viewer

### Teknologi Backend
- Framework: Node.js (Next.js API Routes)
- Autentikasi: Role-based Access Control (RBAC)

### AI System & RAG Pipeline
- Embedding Model: Gemini embedding model
- Vector Database: Supabase Vector (pgvector)
- LLM Provider: LiteLLM
- Voice System: ElevenLabs

### Database Relasional
- Database: PostgreSQL (melalui Prisma ORM)
- Schema: User, Course, Enrollment, Session, Material
