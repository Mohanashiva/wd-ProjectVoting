"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Options extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Options.belongsTo(models.Questions, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
      Options.hasMany(models.ElectionAnswers,{
        foreignKey:"pickedOption",
      });
    }
    static fetchAllOptions(questionId) {
      return this.findAll({
        where: {
          questionId,
        },
        order: [["id", "ASC"]],
      });
    }
    static get1Option(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }
    static deleteAnOption(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
    static updateAnOption({ option, id }) {
      return this.update(
        {
          option,
        },
        {
          where: {
            id,
          },
        }
      );
    }
    static addNewOption({option,questionId}){
      return this.create({
        option,
        questionId,
      })
    }
  }
  
  Options.init(
    {
      option: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Options",
    }
  );
  return Options;
};
