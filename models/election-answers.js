'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ElectionAnswers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ElectionAnswers.belongsTo(models.Voters,{
        foreignKey:"voterId"
      });
      ElectionAnswers.belongsTo(models.Elections,{
        foreignKey:"electionId"
      });
      ElectionAnswers.belongsTo(models.Questions,{
        foreignKey:"questionId"
      });
      ElectionAnswers.belongsTo(models.Options,{
        foreignKey:"pickedOption"
      });

    }
  }
  ElectionAnswers.init(
    {},
   {
    sequelize,
    modelName: 'ElectionAnswers',
  }
);
  return ElectionAnswers;
};