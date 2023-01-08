"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Voters extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Voters.belongsTo(models.Elections, {
        foreignKey: "electionId",
      });
    }
    static async addVoter({ voterUserId, voterPassword, electionId }) {
      return await this.create({
        voterUserId,
        voterPassword,
        electionId,
      });
    }
    static async votersCount(electionId) {
      return await this.count({
        where: {
          electionId,
        },
      })
    }
    static async fetchVoters(electionId) {
      return await this.findAll({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
    }
  }
  Voters.init(
    {
      voterUserId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      voterPassword: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isVoted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      WhoThat: {
        type: DataTypes.STRING,
        defaultValue: "voter",
      },
    },
    {
      sequelize,
      modelName: "Voters",
    }
  );
  return Voters;
};
