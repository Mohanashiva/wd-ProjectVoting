"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Elections extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Elections.belongsTo(models.Admin, {
        foreignKey: "adminId",
      });
      Elections.hasMany(models.Questions, {
        foreignKey: "electionId",
      });
      Elections.hasMany(models.Voter, {
        foreignKey: "electionId",
      });
    }
    static addElection({ electionName, adminId, customURL }) {
      return this.create({
        electionName,
        adminId,
        customURL,
      });
    }

    static getAllElections(adminId) {
      return this.findAll({
        where: {
          adminId,
        },
        order: [["id", "ASC"]],
      });
    }
    static getElectionWithId(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }
  }

  Elections.init(
    {
      electionName: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      customURL: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      isRunning: {
        defaultValue: false,
        type: DataTypes.BOOLEAN,
      },
      isEnded: {
        defaultValue: false,
        type: DataTypes.BOOLEAN,
      },
    },
    {
      sequelize,
      modelName: "Elections",
    }
  );
  return Elections;
};
