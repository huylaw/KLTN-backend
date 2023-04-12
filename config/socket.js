const socketIO = require('socket.io');

const createSocketIO = (httpServer) => {
    const io = socketIO(httpServer, {
        //allowEIO3: true,
        cors: {
            origin: true,
            credential: true
        }
    });

    io.on('connect', (socket) => {
        //user
        // const user = {
        //     socketId: socket.id,
        //     id_user: socket.handshake.auth.id_user,
        //     role: socket.handshake.auth.role,
        // }
        //socket.emit('USER_INFO', user);
        // notification
       // const notification = socket.handshake.auth.
    });
};

module.exports = createSocketIO;