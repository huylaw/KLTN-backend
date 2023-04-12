const sql = require('../config/databse')

var User = {
    getAllUser: function(callback){
        return sql.query("SELECT * FROM user", callback);
    },
    getUserById: function(id, callback){
        return sql.query("SELECT * FROM user WHERE id_user = ?", id, callback);
    },
    addUser: function(user, callback){
        return sql.query("INSERT INTO user SET ?", user, callback);
    },
    updatetUser: function(id, user, callback){
        var x = "UPDATE user SET name = ?, sex = ?, birthday = ?, lunar_birthday = ?, avatar = ?, country = ?, genus = ?, religion = ?, phone = ?, literacy = ?, id_father = ?, id_mother = ?, id_spouse = ?, domicile = ?, resident = ?, job = ?, work_address = ?, deadday = ?, lunar_deadday = ?, description = ? WHERE id_user = ?";
        return sql.query(x, [user.name, user.sex, user.birthday, user.lunar_birthday, user.avatar, user.counntry, user.genus, user.religion, user.phone, user.literacy, user.id_father, user.id_mother, user.id_spouse, user.domicile, user.resident, user.job, user.work_address, user.deadday, user.lunar_deadday, user.description, id], callback);
    },
    deleteUser: function(id, callback){
        var x = "DELETE FROM user WHERE id_user = ?"
        return sql.query(x, id, callback);
    },
    getTwoUser: function(id_1, id_2, callback){
        var x = 'SELECT * FROM user WHERE id_user = ? OR id_user = ?'
        return sql.query(x, [id_1, id_2], callback);
    }
};

module.exports = User;
