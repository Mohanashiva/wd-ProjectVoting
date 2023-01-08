"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Admin.hasMany(models.Elections, {
        foreignKey: "adminId",
      });
    }
  }
  Admin.init(
    {
      FirstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      LastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      WhoThat: {
        type:DataTypes.STRING,
        defaultValue:"admin"
      },
      Email: DataTypes.STRING,
      Password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          len: 8,
        },
      },
    },
    {
      sequelize,
      modelName: "Admin",
    }
  );
  return Admin;
};
