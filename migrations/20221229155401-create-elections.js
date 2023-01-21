"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Elections", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      electionName: {
        type: Sequelize.STRING,
      },
      customURL: {
        type: Sequelize.STRING,
      },
      isRunning: {
        type: Sequelize.BOOLEAN,
        defaultValue:false
      },
      isEnded: {
        type: Sequelize.BOOLEAN,
        defaultValue:false

      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Elections");
  },
};
