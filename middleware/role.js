const jwt = require('jsonwebtoken');

const checkRole = (req, res, next) => {
    try{
        const authHeader = req.header('token');
        const token = authHeader && authHeader.split(' ')[1];
        
        const user = jwt.decode(token);
        if(user.role == 0){
            next();
        }else{
            res.status(403).json({
                status: 403,
                message: "Không có quyền truy cập."
            })
        }
    }catch(error){
        res.status(500).json({
            status: 500,
            message: "Server Error"
        })
    }
}

module.exports = checkRole;