const express = require('express');
const router = express.Router();

const { getProfile } = require('../middleware/getProfile');
const { Op } = require('sequelize');

/***********************
      Contract API 
 **********************/
router.get('/', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const userProfileId = req.profile.id;

  const contracts = await Contract.findAll({
    where: {
      status: {
        [Op.ne]: 'terminated',
      },
      // must belong to profile
      [Op.or]: [{ ContractorId: userProfileId }, { ClientId: userProfileId }],
    },
  });

  res.json(contracts);
});

/**
 * @returns contract by id
 */
router.get('/:id', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const userProfileId = req.profile.id;

  const contract = await Contract.findOne({
    where: {
      id: id,
      // must belong to profile
      [Op.or]: [{ ContractorId: userProfileId }, { ClientId: userProfileId }],
    },
  });

  if (!contract) {
    return res.status(404).end();
  }

  res.json(contract);
});

module.exports = router;
