"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("Users", [
      {
        email: "example@gmail.com",
        passWord: "123456",
        firstName: "John",
        lastName: "Doe",
        gender: false,
        role: "User",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: "example@gmail.com",
        passWord: "1234567",
        firstName: "John",
        lastName: "Doe",
        gender: false,
        role: "User",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
