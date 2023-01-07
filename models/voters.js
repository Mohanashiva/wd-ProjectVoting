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
    static async VotersCount(electionId) {
      return await this.count({
        where: {
          electionId,
        },
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
      isWho: {
        type: DataTypes.STRING,
        defaultValue: "voter",
      },
    },
    {
      sequelize,
      modelName: "Voter",
    }
  );
  return Voters;
};
