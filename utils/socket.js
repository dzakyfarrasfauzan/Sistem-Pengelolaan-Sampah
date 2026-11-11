// ============================================
// Notifikasi real-time dengan WebSocket (Socket.IO)
// Setiap akun yang login bergabung ke ruang "user:<id>". Saat notifikasi baru
// disimpan, server langsung mengirimkannya ke ruang akun penerima.
// ============================================
const { Server } = require('socket.io');

let io = null;

function pasang(httpServer, sessionMiddleware, originFrontend) {
    io = new Server(httpServer, { cors: { origin: originFrontend, credentials: true } });
    // Socket memakai sesi login yang sama dengan Express
    io.engine.use(sessionMiddleware);
    io.on('connection', (socket) => {
        const user = socket.request.session && socket.request.session.user;
        if (!user) return socket.disconnect(true);
        socket.join(`user:${user.id}`);
    });
    return io;
}

// Kirim notifikasi ke daftar id akun penerima
function kirimKe(userIds, data) {
    if (!io) return;
    for (const id of userIds) io.to(`user:${id}`).emit('notifikasi', data);
}

module.exports = { pasang, kirimKe };
