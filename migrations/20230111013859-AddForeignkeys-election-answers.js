'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("ElectionAnswers","voterId",{
      type:Sequelize.DataTypes.INTEGER,
    })
    await queryInterface.addConstraint("ElectionAnswers",{
      fields:["voterId"],
      type:"foreign key",
      references:{
        table:"Voters",
        field:"id",
      }
    })
    await queryInterface.addColumn("ElectionAnswers","electionId",{
      type:Sequelize.DataTypes.INTEGER,
    })
    await queryInterface.addConstraint("ElectionAnswers",{
      fields:["electionId"],
      type:"foreign key",
      references:{
        table:"Elections",
        field:"id",
      }
    })
    await queryInterface.addColumn("ElectionAnswers","questionId",{
      type:Sequelize.DataTypes.INTEGER,
    })
    await queryInterface.addConstraint("ElectionAnswers",{
      fields:["questionId"],
      type:"foreign key",
      references:{
        table:"Questions",
        field:"id",
      }
    })
    await queryInterface.addColumn("ElectionAnswers","pickedOption",{
      type:Sequelize.DataTypes.INTEGER,
    })
    await queryInterface.addConstraint("ElectionAnswers",{
      fields:["pickedOption"],
      type:"foreign key",
      references:{
        table:"Options",
        field:"id",
      }
    })
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("ElectionAnswers", "voterId");
    await queryInterface.removeColumn("ElectionAnswers", "electionId");
    await queryInterface.removeColumn("ElectionAnswers", "questionId");
    await queryInterface.removeColumn("ElectionAnswers", "pickedOption");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
