"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScanRequestHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  ScanRequestHistory.init(
    {
      scanType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tool: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      accessLevel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ScanRequestHistory",
    }
  );

  return ScanRequestHistory;
};
