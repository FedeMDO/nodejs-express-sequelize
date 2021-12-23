var express = require('express');
var router = express.Router();
const { sequelize } = require('../model');

const { Op } = require('sequelize');

/***********************
        Admin API 
 **********************/

/**
 * @returns the best profession.
 * I spoil you: 'Programmer'. But you already knew it even before creating this hometask ;)
 */
router.get('/best-profession', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { start, end } = req.query;

  const jobWhere = {
    paid: true,
    createdAt: {
      [Op.gte]: start,
      [Op.lte]: end,
    },
  };

  const professions = await Profile.findAll({
    group: 'profession',
    limit: 1,
    subQuery: false,
    where: { type: 'contractor' },
    attributes: ['profession'],
    order: sequelize.literal('`Contractor.Jobs.total_earned` DESC'),
    include: [
      {
        model: Contract,
        attributes: ['id'],
        as: 'Contractor',
        group: 'ContractorId',
        required: true,
        include: {
          model: Job,
          where: jobWhere,
          attributes: [
            'ContractId',
            [sequelize.fn('sum', sequelize.col('price')), 'total_earned'],
          ],
          group: 'ContractId',
          required: true,
        },
      },
    ],
  });
  const bestProfession = {
    profession: professions[0] ? professions[0].profession : null,
    total_earned: professions[0]
      ? professions[0].Contractor[0].Jobs[0].dataValues.total_earned
      : null,
  };

  res.json(bestProfession);
});

/**
 * @returns best N clients
 */
router.get('/best-clients', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { start, end, limit } = req.query;
  const safeLimit = parseInt(limit) || 2;

  const jobWhere = {
    paid: true,
    createdAt: {
      [Op.gte]: start,
      [Op.lte]: end,
    },
  };

  const bestClients = await Profile.findAll({
    limit: safeLimit,
    subQuery: false,
    where: { type: 'client' },
    group: 'lastName',
    order: sequelize.literal('`Client.Jobs.total_spent` DESC'),
    include: [
      {
        model: Contract,
        as: 'Client',
        required: true,
        include: {
          model: Job,
          where: jobWhere,
          attributes: [
            'ContractId',
            [sequelize.fn('sum', sequelize.col('price')), 'total_spent'],
          ],
          group: 'ContractId',
          required: true,
        },
      },
    ],
  });

  res.json({
    limit: safeLimit,
    count: bestClients.length,
    bestClients: bestClients.map((x) => {
      return {
        id: x.id,
        fullName: `${x.firstName} ${x.lastName}`,
        paid: x.Client[0].Jobs[0].dataValues.total_spent,
      };
    }),
  });
});

module.exports = router;
