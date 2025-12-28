const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");

const express = require('express');
require('dotenv').config();

// Express server untuk health check
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>TOUCH #15 WhatsApp Bot</title>
        <meta http-equiv="refresh" content="0; url=https://github.com/username/repo-name">
      </head>
      <body>
        <h1>TOUCH #15 WhatsApp Bot is running!</h1>
        <p>Status: ✅ Online</p>
        <p>Uptime: ${process.uptime().toFixed(0)} seconds</p>
        <p>Time: ${new Date().toLocaleString('id-ID')}</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// Konfigurasi Database Connection Pool
const dbConfig = {
  host: "103.219.251.163",
  user: "osische1_regis",
  password: "Haidarfath15",
  database: "osische1_touch15",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool;

async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log("✅ Database pool initialized successfully");
    const [rows] = await connection.execute("SELECT 1 as test");
    console.log("✅ Database test query successful:", rows[0].test);
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize database pool:", error.message);
    console.log("🔄 Retrying in 10 seconds...");
    setTimeout(initializePool, 10000);
    return false;
  }
}

async function getConnection() {
  if (!pool) {
    await initializePool();
  }
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error("❌ Failed to get connection from pool:", error.message);
    throw error;
  }
}

async function executeQuery(query, params = []) {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error("❌ Query execution failed:", error.message);
    console.error("Query:", query);
    console.error("Params:", params);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

const qrisPath = path.join(__dirname, "qris.png");

const opsiHari = [
  { hari: "Senin", waktu: "16.00 - 17.30" },
  { hari: "Selasa", waktu: "16.00 - 17.30" },
  { hari: "Rabu", waktu: "16.00 - 17.30" },
  { hari: "Kamis", waktu: "16.00 - 17.30" },
  { hari: "Jumat", waktu: "16.00 - 17.30" },
  { hari: "Sabtu", waktu: "10.30 - 16.30" },
];

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "touch15-bot",
    dataPath: "./.wwebjs_auth",
  }),
  puppeteer: {
  headless: true,  // Ubah ke true untuk Replit
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-software-rasterizer',
    '--disable-features=VizDisplayCompositor',
    '--disable-features=site-per-process'
  ],
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser'
}
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
});

// FUNGSI UNTUK PARSE JSON YANG DOUBLE ESCAPED DENGAN HANDLING KHUSUS
function parseDoubleEscapedJSON(jsonString) {
  if (
    !jsonString ||
    jsonString === "null" ||
    jsonString === '""' ||
    jsonString.trim() === ""
  ) {
    return [];
  }

  console.log("🔧 Original JSON string:", jsonString.substring(0, 200) + "...");

  try {
    // Coba parse langsung - ini untuk JSON yang sudah valid
    const parsed = JSON.parse(jsonString);

    // Hapus escape karakter dari nilai string
    const cleanParsed = parsed.map((item) => {
      const cleaned = {};
      for (const key in item) {
        if (typeof item[key] === "string") {
          // Hapus escape karakter: \', \", \\
          cleaned[key] = item[key]
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        } else {
          cleaned[key] = item[key];
        }
      }
      return cleaned;
    });

    return cleanParsed;
  } catch (e1) {
    console.log("⚠️ First parse failed, trying to fix...");

    try {
      // Versi 1: Bersihkan escaping berlebihan sebelum parsing
      let fixed = jsonString;

      // Handle double escaping
      fixed = fixed.replace(/\\\\/g, "\\");

      // Handle escaped quotes
      fixed = fixed.replace(/\\"/g, '"');

      // Handle escaped single quotes
      fixed = fixed.replace(/\\'/g, "'");

      // Hapus quotes di awal dan akhir jika ada
      if (fixed.startsWith('"') && fixed.endsWith('"')) {
        fixed = fixed.substring(1, fixed.length - 1);
      }

      // Pastikan format array JSON
      if (!fixed.startsWith("[") && !fixed.startsWith("{")) {
        fixed = "[" + fixed + "]";
      }

      console.log("🔧 Fixed JSON string:", fixed.substring(0, 200) + "...");

      const parsed = JSON.parse(fixed);

      // Hapus escape karakter dari nilai string
      const cleanParsed = parsed.map((item) => {
        const cleaned = {};
        for (const key in item) {
          if (typeof item[key] === "string") {
            cleaned[key] = item[key]
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, "\\");
          } else {
            cleaned[key] = item[key];
          }
        }
        return cleaned;
      });

      return cleanParsed;
    } catch (e2) {
      console.log("⚠️ Second parse failed, trying manual extraction...");

      try {
        // Versi 2: Ekstraksi manual
        const jsonMatch =
          jsonString.match(/\[.*\]/s) || jsonString.match(/\{.*\}/s);

        if (jsonMatch) {
          let extracted = jsonMatch[0];

          // Bersihkan escaping
          extracted = extracted.replace(/\\\\/g, "\\");
          extracted = extracted.replace(/\\"/g, '"');
          extracted = extracted.replace(/\\'/g, "'");

          console.log(
            "🔧 Extracted JSON string:",
            extracted.substring(0, 200) + "..."
          );

          const parsed = JSON.parse(extracted);

          // Hapus escape karakter dari nilai string
          const cleanParsed = parsed.map((item) => {
            const cleaned = {};
            for (const key in item) {
              if (typeof item[key] === "string") {
                cleaned[key] = item[key]
                  .replace(/\\'/g, "'")
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, "\\");
              } else {
                cleaned[key] = item[key];
              }
            }
            return cleaned;
          });

          return cleanParsed;
        }
      } catch (e3) {
        console.error("❌ All JSON parsing attempts failed");
        console.error("Error 1:", e1.message);
        console.error("Error 2:", e2.message);
        console.error("Error 3:", e3.message);

        // Fallback: return array kosong
        return [];
      }
    }
  }
}

// FUNGSI UNTUK MENDAPATKAN DATA DENGAN BENAR
async function findRegistrationData(kodeUnik) {
  try {
    console.log(`🔍 Querying database for ${kodeUnik}`);

    const query = `
      SELECT 
        id,
        kode_unik,
        jumlah_tiket,
        total_harga,
        jenis_pembayaran,
        status_pembayaran,
        created_at as timestamp,
        data_pembeli
      FROM tiket_pembelian 
      WHERE kode_unik = ?
    `;

    const rows = await executeQuery(query, [kodeUnik]);

    if (rows.length === 0) {
      console.log(`❌ No data found for ${kodeUnik}`);
      return null;
    }

    const data = rows[0];

    console.log("📊 Raw data retrieved:", {
      id: data.id,
      kode_unik: data.kode_unik,
      jumlah_tiket: data.jumlah_tiket,
      data_pembeli_length: data.data_pembeli ? data.data_pembeli.length : 0,
      data_pembeli_sample: data.data_pembeli
        ? data.data_pembeli.substring(0, 200) + "..."
        : "null",
    });

    // Parse data_pembeli dengan fungsi khusus
    if (data.data_pembeli) {
      data.data_pembeli = parseDoubleEscapedJSON(data.data_pembeli);
      console.log(
        `✅ Parsed ${data.data_pembeli.length} peserta from data_pembeli`
      );

      // Clean up data: Hapus escape karakter dari semua field string
      data.data_pembeli = data.data_pembeli.map((peserta) => {
        const cleanPeserta = {};
        for (const key in peserta) {
          if (typeof peserta[key] === "string") {
            // Hapus semua escape karakter
            cleanPeserta[key] = peserta[key]
              .replace(/\\'/g, "'") // Hapus \'
              .replace(/\\"/g, '"') // Hapus \"
              .replace(/\\\\/g, "\\"); // Hapus \\
          } else {
            cleanPeserta[key] = peserta[key];
          }
        }
        return cleanPeserta;
      });

      // Log detail setiap peserta
      if (data.data_pembeli.length > 0) {
        console.log("📋 Participant details:");
        data.data_pembeli.forEach((p, i) => {
          console.log(
            `  Peserta ${i + 1}: ${p.nama || "No name"} - ${
              p.asal_sekolah || "No school"
            } - ${p.no_wa || "No WA"}`
          );
        });
      }
    } else {
      data.data_pembeli = [];
      console.log("⚠️ data_pembeli is null or empty");
    }

    return data;
  } catch (error) {
    console.error(`❌ Error finding data for ${kodeUnik}:`, error.message);
    console.error("Full error:", error);
    return null;
  }
}

// =======================================================
// FUNGSI VERIFIKASI YANG SUDAH DIPERBAIKI
// =======================================================

// FUNGSI CEK VERIFIKASI WHATSAPP LID (TANPA WARNING)
async function isWhatsAppRegisteredForCode(sender, kodeUnik) {
  try {
    console.log(`🔐 Verifying ${sender} for code ${kodeUnik}`);
    
    // CEK APAKAH INI WHATSAPP LID
    const isLid = sender.endsWith('@lid');
    console.log(`📱 Is WhatsApp LID? ${isLid ? 'YES' : 'NO'}`);
    
    // JIKA WHATSAPP LID (@lid), SELALU BERI AKSES
    if (isLid) {
      console.log(`✅ Auto-approving WhatsApp LID: ${sender.split('@')[0]}`);
      
      // Cek apakah kode valid di database
      const query = `
        SELECT id, data_pembeli 
        FROM tiket_pembelian 
        WHERE kode_unik = ?
      `;
      
      const rows = await executeQuery(query, [kodeUnik]);
      
      if (rows.length > 0) {
        console.log(`✅ Code ${kodeUnik} is valid, granting access`);
        return true;
      } else {
        console.log(`❌ Code ${kodeUnik} not found in database`);
        return false;
      }
    }
    
    // JIKA BUKAN LID, VERIFIKASI NOMOR TELEPON
    console.log(`📞 Regular WhatsApp verification for ${sender}`);
    
    const query = `
      SELECT 
        id,
        kode_unik,
        data_pembeli
      FROM tiket_pembelian 
      WHERE kode_unik = ?
    `;

    const rows = await executeQuery(query, [kodeUnik]);

    if (rows.length === 0) {
      console.log(`❌ No registration found for ${kodeUnik}`);
      return false;
    }

    const data = rows[0];
    
    // Parse data_pembeli
    let dataPembeli = [];
    if (data.data_pembeli) {
      dataPembeli = parseDoubleEscapedJSON(data.data_pembeli);
    }

    const senderPhone = sender.split('@')[0].replace(/\D/g, '');
    console.log(`📞 Sender phone: ${senderPhone}`);
    
    for (const peserta of dataPembeli) {
      if (peserta.no_wa) {
        const dbPhone = peserta.no_wa.replace(/\D/g, '');
        console.log(`🔍 Comparing: DB=${dbPhone} vs Sender=${senderPhone}`);
        
        if (dbPhone === senderPhone) {
          console.log(`✅ Phone number match for ${peserta.nama}`);
          return true;
        }
      }
    }
    
    console.log(`❌ Phone number mismatch for ${kodeUnik}`);
    return false;
    
  } catch (error) {
    console.error(`❌ Error verifying for ${kodeUnik}:`, error.message);
    return false;
  }
}

// =======================================================
// FUNGSI UNTUK FORMAT INFORMASI PESERTA
// =======================================================

// FUNGSI UNTUK FORMAT INFORMASI PESERTA (SESUAI FORMAT YANG DIMINTA)
function formatPesertaInfo(dataPembeli) {
  if (!Array.isArray(dataPembeli) || dataPembeli.length === 0) {
    return "";
  }

  let result = "";

  // Jika hanya 1 peserta, format langsung di header
  if (dataPembeli.length === 1) {
    const peserta = dataPembeli[0];
    result += `\n👤 *Peserta 1*\n`;
    result += `   Nama Lengkap: ${peserta.nama || "-"}\n`;
    result += `   Asal Sekolah: ${peserta.asal_sekolah || "-"}\n`;
    result += `   Nomor WhatsApp: ${peserta.no_wa || "-"}\n`;
    result += `   Email: ${peserta.email || "-"}\n`;
    return result;
  }

  // Jika lebih dari 1 peserta, format terpisah
  result += `\n`;
  dataPembeli.forEach((peserta, index) => {
    result += `👤 *Peserta ${index + 1}*\n`;
    result += `   Nama Lengkap: ${peserta.nama || "-"}\n`;
    result += `   Asal Sekolah: ${peserta.asal_sekolah || "-"}\n`;
    result += `   Nomor WhatsApp: ${peserta.no_wa || "-"}\n`;
    result += `   Email: ${peserta.email || "-"}\n`;

    // Tambahkan baris kosong antar peserta kecuali peserta terakhir
    if (index < dataPembeli.length - 1) {
      result += `\n`;
    }
  });

  return result;
}

// FUNGSI UNTUK FORMAT INFORMASI PENDAFTARAN UTAMA
function formatRegistrationInfo(data) {
  const paymentStatus = data.status_pembayaran || "pending";
  const tanggal = data.timestamp ? new Date(data.timestamp) : new Date();

  let result = `*INFORMASI PENDAFTARAN TOUCH #15*\n`;
  result += `═══════════════════════════\n`;
  result += `📋 *Kode:* ${data.kode_unik}\n`;
  result += `📅 *Tanggal Daftar:* ${tanggal.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}\n`;
  result += `⏰ *Waktu Daftar:* ${tanggal.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}\n`;
  result += `🎫 *Jumlah Tiket:* ${data.jumlah_tiket}\n`;
  result += `💰 *Total:* Rp ${parseInt(data.total_harga || 0).toLocaleString(
    "id-ID"
  )}\n`;
  result += `💳 *Metode:* ${
    data.jenis_pembayaran === "online" ? "Online (QRIS)" : "Offline (Tunai)"
  }\n`;

  if (paymentStatus === "lunas") {
    result += `✅ *Status Pembayaran:* LUNAS\n`;
  } else {
    result += `⏳ *Status Pembayaran:* BELUM LUNAS\n`;
  }

  return result;
}

// =======================================================
// FUNGSI UNTUK KIRIM PESAN
// =======================================================

// FUNGSI UNTUK KIRIM PESAN ERROR AKSES DITOLAK
async function sendAccessDeniedMessage(sender) {
  const deniedMsg =
    `❌ *AKSES DITOLAK*\n\n` +
    `Nomor WhatsApp ini *tidak terdaftar* untuk mengakses informasi pendaftaran.\n\n` +
    `*Alasan yang mungkin:*\n` +
    `1. Nomor WhatsApp berbeda dengan yang didaftarkan\n` +
    `2. Kode pendaftaran tidak valid\n` +
    `3. Data pendaftaran belum lengkap\n\n` +
    `*Solusi:*\n` +
    `• Pastikan Anda menggunakan nomor WhatsApp yang sama dengan saat pendaftaran\n` +
    `• Periksa kembali kode pendaftaran Anda\n` +
    `• Hubungi panitia jika ada kesalahan data\n\n` +
    `📞 *Kontak Panitia:*\n` +
    `• Leny: 0878-2654-0014\n` +
    `• Sita: 0859-5022-3994\n\n` +
    `_Terima kasih atas pengertiannya._`;

  await client.sendMessage(sender, deniedMsg);
}

async function sendOnlinePaymentInfo(sender, data) {
  try {
    await client.sendMessage(
      sender,
      `*PEMBAYARAN ONLINE VIA QRIS*\n` +
        `═══════════════════════════\n` +
        `📋 *Kode Pendaftaran:* ${data.kode_unik}\n` +
        `💰 *Total Pembayaran:* Rp ${parseInt(data.total_harga).toLocaleString(
          "id-ID"
        )}\n\n` +
        `Silakan scan QRIS berikut untuk melakukan pembayaran.\n\n` +
        `*INSTRUKSI PEMBAYARAN:*\n` +
        `1. Buka aplikasi mobile banking/e-wallet\n` +
        `2. Pilih menu "Scan QRIS" atau "Bayar dengan QR"\n` +
        `3. Scan QR code di bawah\n` +
        `4. Pastikan nominal: *Rp ${parseInt(data.total_harga).toLocaleString(
          "id-ID"
        )}*\n` +
        `5. Konfirmasi pembayaran\n\n` +
        `⏰ *Batas Waktu:* 24 jam\n` +
        `📞 *Kendala?* 0878-2654-0014 (Leny)`
    );

    try {
      await fs.access(qrisPath);
      const qris = MessageMedia.fromFilePath(qrisPath);
      await client.sendMessage(sender, qris, {
        caption: `QRIS TOUCH #15 - Rp ${parseInt(
          data.total_harga
        ).toLocaleString("id-ID")}`,
      });
    } catch (error) {
      console.log("QRIS file not found, sending bank info");
      await client.sendMessage(
        sender,
        `\n*ATAU TRANSFER KE:*\n` +
          `🏦 *Bank:* BCA\n` +
          `📋 *No. Rekening:* 123-456-7890\n` +
          `👤 *Atas Nama:* PANITIA TOUCH 15\n` +
          `💰 *Nominal:* Rp ${parseInt(data.total_harga).toLocaleString(
            "id-ID"
          )}\n` +
          `📝 *Keterangan:* ${data.kode_unik}\n\n` +
          `*Kirim bukti transfer ke nomor ini.*`
      );
    }
  } catch (error) {
    console.error("Error in sendOnlinePaymentInfo:", error);
    throw error;
  }
}

async function sendOfflinePaymentInfo(sender, data) {
  try {
    let pesanOffline = `*PEMBAYARAN OFFLINE (TUNAI)*\n`;
    pesanOffline += `═══════════════════════════\n`;
    pesanOffline += `📋 *Kode:* ${data.kode_unik}\n`;
    pesanOffline += `💰 *Total:* Rp ${parseInt(data.total_harga).toLocaleString(
      "id-ID"
    )}\n`;

    pesanOffline += `📍 *Lokasi:* SMK-SMTI Yogyakarta\n`;
    pesanOffline += `🗺️ *Alamat:* Jl. Kusumanegara No.3, Yogyakarta\n\n`;

    pesanOffline += `*PILIHAN HARI PEMBAYARAN:*\n`;
    opsiHari.forEach((hari, index) => {
      pesanOffline += `\n${index + 1}. *${hari.hari}*, ⏰ ${hari.waktu}`;
    });

    pesanOffline += `\n\n*PERSYARATAN:*\n`;
    pesanOffline += `1. Kartu Pelajar\n`;
    pesanOffline += `2. Tunjukkan bukti/kode pendaftaran\n`;
    pesanOffline += `3. Uang pas: Rp ${parseInt(
      data.total_harga
    ).toLocaleString("id-ID")}\n\n`;

    pesanOffline += `📞 *KONTAK PANITIA:*\n`;
    pesanOffline += `• Leny: 0878-2654-0014\n`;
    pesanOffline += `• Sita: 0859-5022-3994`;

    await client.sendMessage(sender, pesanOffline);
  } catch (error) {
    console.error("Error in sendOfflinePaymentInfo:", error);
    throw error;
  }
}

// =======================================================
// FUNGSI HANDLE PESAN
// =======================================================

// FUNGSI UNTUK PROSES REQUEST PEMBAYARAN DENGAN VERIFIKASI
async function handlePaymentRequest(sender, message) {
  const pattern =
    /Halo, saya sudah melakukan pendaftaran TOUCH #15 dengan kode:\s*(#TOUCH15\d+)\s*Saya ingin melanjutkan proses pembayaran\./i;
  const match = message.match(pattern);

  if (!match) {
    return false;
  }

  const kodeUnik = match[1].toUpperCase();
  const senderNumber = sender.split('@')[0];

  console.log(`💳 Payment info request for ${kodeUnik} from ${senderNumber}`);

  // VERIFIKASI NOMOR WHATSAPP
  const isVerified = await isWhatsAppRegisteredForCode(sender, kodeUnik);

  if (!isVerified) {
    await sendAccessDeniedMessage(sender);
    return true;
  }

  try {
    const data = await findRegistrationData(kodeUnik);

    if (!data) {
      await client.sendMessage(
        sender,
        `❌ *Kode Tidak Ditemukan*\n\nKode *${kodeUnik}* tidak terdaftar.\n\n📞 Hubungi Leny: 0878-2654-0014`
      );
      return true;
    }

    const paymentStatus = data.status_pembayaran || "pending";

    // FORMAT 1: Informasi Pendaftaran + Peserta
    let response = formatRegistrationInfo(data);

    // Tambahkan data peserta
    if (Array.isArray(data.data_pembeli) && data.data_pembeli.length > 0) {
      response += formatPesertaInfo(data.data_pembeli);
    }

    response += `\n═══════════════════════════\n`;

    // Kirim informasi pendaftaran
    await client.sendMessage(sender, response);

    // Cek status pembayaran
    if (paymentStatus === "lunas") {
      await client.sendMessage(
        sender,
        `✅ *PEMBAYARAN SUDAH LUNAS*\n\n` +
          `Pembayaran untuk kode *${data.kode_unik}* sudah terverifikasi.\n\n` +
          `Terima kasih! Silakan tunggu informasi berikutnya dari panitia.\n\n` +
          `📞 *Bantuan:* Leny 0878-2654-0014`
      );
      return true;
    }

    // Jika belum lunas, kirim info pembayaran
    if (data.jenis_pembayaran === "online") {
      await sendOnlinePaymentInfo(sender, data);
    } else {
      await sendOfflinePaymentInfo(sender, data);
    }

    // Kirim pesan penutup
    await client.sendMessage(
      sender,
      `═══════════════════════════\n` +
        `📝 *CATATAN PENTING:*\n\n` +
        `${
          data.jenis_pembayaran === "online"
            ? "1. Selesaikan pembayaran dalam 24 jam\n2. Kirim bukti transfer ke nomor ini\n3. Tunggu verifikasi dari panitia"
            : "1. Pilih hari dari opsi di atas\n2. Datang sesuai jadwal pilihan\n3. Bayar tunai ke panitia\n4. Dapatkan tiket"
        }\n\n` +
        `✅ Informasi berikutnya akan dikirim via WhatsApp setelah pembayaran terverifikasi.\n\n` +
        `📞 *Bantuan:* Leny 0878-2654-0014\n\n` +
        `*Terima kasih!* 🎉`
    );

    return true;
  } catch (error) {
    console.error("❌ Error handling payment request:", error);
    await client.sendMessage(
      sender,
      `❌ *Terjadi Kesalahan Sistem*\n\n` +
        `Mohon maaf, sistem sedang mengalami gangguan teknis.\n\n` +
        `📞 *Hubungi Panitia:* 0878-2654-0014\n\n` +
        `_Mohon maaf atas ketidaknyamanannya._`
    );
    return true;
  }
}

// FUNGSI UNTUK PROSES KODE BIASA DENGAN VERIFIKASI
async function handleRegularCode(sender, kodeUnik) {
  const senderNumber = sender.split('@')[0];
  console.log(`🔍 Processing regular code ${kodeUnik} for ${senderNumber}`);

  // VERIFIKASI NOMOR WHATSAPP
  const isVerified = await isWhatsAppRegisteredForCode(sender, kodeUnik);

  if (!isVerified) {
    await sendAccessDeniedMessage(sender);
    return;
  }

  try {
    const data = await findRegistrationData(kodeUnik);

    if (!data) {
      await client.sendMessage(
        sender,
        `❌ *Kode Tidak Ditemukan*\n\n` +
          `Kode *${kodeUnik}* tidak terdaftar.\n\n` +
          `📞 *Hubungi Leny:* 0878-2654-0014`
      );
      return;
    }

    // FORMAT 1: Informasi Pendaftaran + Peserta
    let response = formatRegistrationInfo(data);

    // Tambahkan data peserta
    if (Array.isArray(data.data_pembeli) && data.data_pembeli.length > 0) {
      response += formatPesertaInfo(data.data_pembeli);
    }

    response += `\n═══════════════════════════\n`;

    // Kirim informasi pendaftaran
    await client.sendMessage(sender, response);

    const paymentStatus = data.status_pembayaran || "pending";

    if (paymentStatus === "lunas") {
      await client.sendMessage(
        sender,
        `✅ *PEMBAYARAN SUDAH LUNAS*\n\n` +
          `Pembayaran Anda sudah terverifikasi. Tiket akan dikirim via WhatsApp.\n\n` +
          `📞 *Bantuan:* Leny 0878-2654-0014`
      );
    } else {
      // Informasi cara minta pembayaran
      await client.sendMessage(
        sender,
        `💡 *INGIN MELANJUTKAN PEMBAYARAN?*\n\n` +
          `Kirim pesan berikut untuk mendapatkan informasi pembayaran:\n\n` +
          `"Halo, saya sudah melakukan pendaftaran TOUCH #15 dengan kode: ${data.kode_unik} Saya ingin melanjutkan proses pembayaran."\n\n` +
          `📞 *Bantuan:* Leny 0878-2654-0014`
      );
    }

    console.log(`✅ Data sent to ${senderNumber} for ${kodeUnik}`);
  } catch (error) {
    console.error("❌ Error processing regular code:", error);
    await client.sendMessage(
      sender,
      `❌ *Terjadi Kesalahan Sistem*\n\n` +
        `Coba lagi nanti atau hubungi panitia: 0878-2654-0014`
    );
  }
}

// =======================================================
// EVENT HANDLERS
// =======================================================

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("\n" + "═".repeat(50));
  console.log("🤖 BOT TOUCH #15 - SCAN QR CODE");
  console.log("═".repeat(50));
});

client.on("authenticated", () => {
  console.log("✅ WhatsApp authenticated!");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failure:", msg);
});

client.on("disconnected", (reason) => {
  console.error("❌ Client disconnected:", reason);
});

client.on("ready", async () => {
  console.log("\n" + "⭐".repeat(50));
  console.log("🚀 BOT TOUCH #15 READY!");
  console.log("⭐".repeat(50));
  console.log(`👤 Logged in as: ${client.info.pushname}`);
  console.log(`📱 Phone: ${client.info.wid.user}`);
  console.log(`⏰ Time: ${new Date().toLocaleString("id-ID")}`);
  console.log("⭐".repeat(50) + "\n");

  console.log("🔗 Initializing database connection pool...");
  await initializePool();
});

// Event handler utama untuk menerima pesan
client.on("message", async (msg) => {
  try {
    // Skip status updates and broadcasts
    if (msg.from === "status@broadcast") {
      return;
    }

    // Skip messages from groups if bot is not intended for groups
    if (msg.isGroupMsg) {
      console.log(`👥 Skipping group message from ${msg.from}`);
      return;
    }

    const text = msg.body?.trim() || "";
    const sender = msg.from;
    const senderNumber = sender.split("@")[0];

    console.log(
      `📩 NEW MESSAGE from ${senderNumber}: ${text.substring(0, 100)}`
    );

    // 1. Cek apakah ini request pembayaran spesifik
    const paymentProcessed = await handlePaymentRequest(sender, text);
    if (paymentProcessed) {
      return;
    }

    // 2. Cek kode biasa
    const kodeMatch = text.match(/#touch15\d+/i);
    if (kodeMatch) {
      const kodeUnik = kodeMatch[0].toUpperCase();
      await handleRegularCode(sender, kodeUnik);
      return;
    }

    // 3. Perintah bantuan
    if (
      text === "!help" ||
      text === "bantuan" ||
      text === "/help" ||
      text === "help"
    ) {
      const helpMsg =
        `*BOT TOUCH #15 - BANTUAN*\n\n` +
        `*CARA PENGGUNAAN:*\n\n` +
        `1. *CEK PENDAFTARAN:*\n` +
        `   Kirim kode pendaftaran Anda\n` +
        `   Contoh: #TOUCH150031\n\n` +
        `2. *MINTA INFO PEMBAYARAN:*\n` +
        `   Kirim pesan berikut:\n` +
        `   "Halo, saya sudah melakukan pendaftaran TOUCH #15 dengan kode: #TOUCH150031 Saya ingin melanjutkan proses pembayaran."\n\n` +
        `3. *KONTAK PANITIA:*\n` +
        `   • Leny: 0878-2654-0014\n` +
        `   • Sita: 0859-5022-3994\n\n` +
        `📋 *Format kode:* #TOUCH15 + 4 angka\n\n` +
        `*PERHATIAN:*\n` +
        `Anda hanya dapat mengakses informasi dengan nomor WhatsApp yang terdaftar saat pendaftaran.\n\n` +
        `_Semoga membantu!_ 😊`;

      await client.sendMessage(sender, helpMsg);
      return;
    }

    // 4. Auto reply untuk sapaan
    const lowerText = text.toLowerCase();
    if (
      (lowerText.includes("halo") ||
        lowerText.includes("hai") ||
        lowerText.includes("assalam") ||
        lowerText === "hi" ||
        lowerText === "hello") &&
      text.length < 50
    ) {
      await client.sendMessage(
        sender,
        `Haloo! 👋\n\n` +
          `Selamat datang di *Bot TOUCH #15*.\n\n` +
          `Untuk mengecek pendaftaran, kirimkan *kode pendaftaran* Anda.\n` +
          `Contoh: #TOUCH150001\n\n` +
          `*PERHATIAN:*\n` +
          `Hanya nomor WhatsApp yang terdaftar saat pendaftaran yang dapat mengakses informasi.\n\n` +
          `Untuk meminta informasi pembayaran, kirim:\n` +
          `"Halo, saya sudah melakukan pendaftaran TOUCH #15 dengan kode: #TOUCH150001 Saya ingin melanjutkan proses pembayaran."\n\n` +
          `Butuh bantuan? Ketik: *!help*\n\n` +
          `_Semoga hari Anda menyenangkan!_ 😊`
      );
      return;
    }

  } catch (error) {
    console.error("❌ Error processing message:", error);
  }
});

// Health check
setInterval(async () => {
  if (pool) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute("SELECT 1 as health_check");
      connection.release();
      if (rows[0].health_check === 1) {
        console.log("💚 Database health check: OK");
      }
    } catch (error) {
      console.error("💔 Database health check failed:", error.message);
      console.log("🔄 Reinitializing database pool...");
      await initializePool();
    }
  }
}, 5 * 60 * 1000);

// Handle shutdown
async function shutdown() {
  console.log("\n🛑 Shutting down bot gracefully...");
  if (pool) {
    try {
      await pool.end();
      console.log("✅ Database pool closed");
    } catch (error) {
      console.error("Error closing pool:", error);
    }
  }
  client.destroy();
  console.log("✅ WhatsApp client destroyed");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start bot
console.log("🚀 Initializing TOUCH #15 WhatsApp Bot...");
console.log("⏳ Please wait for QR code...");

client.initialize().catch((err) => {
  console.error("❌ Failed to initialize client:", err);

});

