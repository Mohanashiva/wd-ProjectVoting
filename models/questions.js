"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Questions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Questions.belongsTo(models.Elections, {
        foreignKey: "electionId",
      });
      Questions.hasMany(models.Options, {
        foreignKey: "questionId",
      });
      Questions.hasMany(models.ElectionAnswers,{
        foreignKey:"questionId"
      });
    }
    static addNewQuestion({ question, description, electionId }) {
      return this.create({
        electionQuestion:question,
        questionDescription:description,
        electionId,
      });
    }
    static async countOfQuestions(electionId) {
      return  this.count({
        where: {
          electionId,
        },
      });
    }
    static getQuestionWithId(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }
    static async fetchQuestionWithName(question,description){
      return this.findOne({
        where:{
          electionQuestion:question,
          questionDescription:description,
        }
      })
    }
    static delQuestion(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
    static updateAQuestion({electionQuestion,questionDescription,id}){
      return this.update({
        electionQuestion,
        questionDescription,
      },
      {
        returning:true,
        where:{
          id,
        }
      }
      )
    }
    static async fetchAllQuestions(electionId) {
      return this.findAll({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
    }
  }
  Questions.init(
    {
      electionQuestion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      questionDescription: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Questions",
    }
  );
  return Questions;
};
