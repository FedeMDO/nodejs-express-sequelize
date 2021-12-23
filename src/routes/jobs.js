var express = require('express');
var router = express.Router();
const { sequelize } = require('../model');

const { getProfile } = require('../middleware/getProfile');
const { Op } = require('sequelize');

/***********************
         Job API 
 **********************/

/**
 * @returns all unpaid jobs
 */
router.get('/unpaid', getProfile, async (req, res) => {
  const { Job, Contract } = req.app.get('models');
  const userProfileId = req.profile.id;

  const unpaidJobs = await Job.findAll({
    include: [
      {
        model: Contract,
        where: {
          status: 'in_progress', // I assume 'active contracts only' means 'in_progress'
          // contract must belong to profile
          [Op.or]: [
            { ContractorId: userProfileId },
            { ClientId: userProfileId },
          ],
        },
      },
    ],
    where: {
      paid: null, // seedDb.js doesn't initialize this field to false, so its mapped to NULL in DB
    },
  });

  res.json(unpaidJobs);
});

router.post('/:job_id/pay', getProfile, async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { job_id } = req.params;

  // transaction to update profiles' balances and job payment info
  try {
    await sequelize.transaction(async (t) => {
      const job = await Job.findOne({
        include: [
          {
            model: Contract,
            where: {
              ClientId: req.profile.id,
            },
          },
        ],
        where: {
          id: job_id,
          paid: null, // we only want unpaid jobs
        },
      });

      // a client can only pay if his balance >= the amount to pay
      if (!job || req.profile.balance < job.price) {
        return res.status(400).end();
      }
      // find contractor's profile
      const contractor = await Profile.findOne({
        include: {
          model: Contract,
          as: 'Contractor',
          where: { id: job.ContractId },
        },
        transaction: t,
      });

      // decrement client's balance
      await Profile.decrement('balance', {
        by: job.price,
        where: { id: req.profile.id },
        transaction: t,
      });

      // update job payment info
      await Job.update(
        {
          paid: true,
          paymentDate: new Date().toISOString(), // timestamp
        },
        { where: { id: job_id }, transaction: t }
      );

      // increment contractor's balance
      await Profile.increment('balance', {
        by: job.price,
        where: { id: contractor.id },
        transaction: t,
      });
    });
    // If the execution reaches this line, the transaction has been committed successfully
    return res.status(200).end();
  } catch (error) {
    // If the execution reaches this line, an error occurred.
    // The transaction has already been rolled back automatically by Sequelize!
    return res.status(500).end();
  }
});

module.exports = router;
