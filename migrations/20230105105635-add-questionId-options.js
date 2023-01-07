"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.addColumn("Options", "questionId", {
      type: Sequelize.DataTypes.INTEGER,
      onDelete: "CASCADE",
    });

    await queryInterface.addConstraint("Options", {
      fields: ["questionId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "Questions",
        field: "id",
      },
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    queryInterface.removeColumn("Options", "questionId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
