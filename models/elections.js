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
      Elections.hasMany(models.Voters, {
        foreignKey: "electionId",
      });
      Elections.hasMany(models.ElectionAnswers,{
        foreignKey:"electionId"
      })
    }
    static addElection({ electionName, adminId, customURL }) {
      return this.create({
        electionName:electionName,
        adminId:adminId,
        customURL:customURL,
      });
    }
    static fetchAllURL(adminId){
      return this.findAll({
        where:adminId,
        attributes:['customURL']
      })
    }

    static getAllElections(adminId) {
      return this.findAll({
        where: {
          adminId,
        },
        order: [["id", "ASC"]],
      });
    }
    static async fetchElectionWithURL(customURL){
      return this.findOne({
        where:{
          customURL
        },
        order: [["id", "ASC"]],
      })
    }
    static startElection(id) {
      return this.update(
        {
          isRunning: true,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      )};
      static EndThisElection(id) {
        return this.update(
          {
            isRunning: false,
            isEnded: true,
          },
          {
            returning: true,
            where: {
              id,
            },
          }
        );
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
