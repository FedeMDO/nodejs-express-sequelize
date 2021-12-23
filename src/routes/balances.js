var express = require('express');
var router = express.Router();
const { sequelize } = require('../model');

const { Op } = require('sequelize');

/***********************
        Balance API 
 **********************/

/**
 * @returns status 200 OK.
 * Please see README, I was confused about this specific endpoint.
 * I'm implementing it as I understood the task. But it may be wrong and I don't have time to clarify.
 */
router.post('/deposit/:userId', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const { userId } = req.params;
  let { depositAmount } = req.body;

  depositAmount = Number(depositAmount);

  if (isNaN(depositAmount) || isNaN(userId) || depositAmount <= 0) {
    console.error('invalid depositAmount or userId');
    return res.status(400).end();
  }

  try {
    await sequelize.transaction(async (t) => {
      // sum job debt ('jobs to pay')
      const jobDebt = await Job.findOne({
        transaction: t,
        attributes: [
          [sequelize.fn('sum', sequelize.col('price')), 'total_debt'],
        ],
        where: {
          paid: null,
        },
        include: {
          model: Contract,
          where: {
            ClientId: userId,
            status: {
              [Op.ne]: 'terminated', // only 'new' and 'in_progress' contracts
            },
          },
        },
      });

      // a client can't deposit more than 25% his total of 'jobs to pay' (what I call debt).
      // See my notes in README, please
      // if debt is 323.234234 we allow to deposit until $324
      if (
        !jobDebt ||
        depositAmount > Math.ceil(jobDebt.dataValues.total_debt * 0.25)
      ) {
        // rollback is managed by sequelize
        throw new Error(
          `depositAmount must be less or equal than ${Math.ceil(
            jobDebt.dataValues.total_debt * 0.25
          )}`
        );
      }

      // increment client's balance
      await Profile.increment('balance', {
        by: depositAmount,
        where: { id: userId },
        transaction: t,
      });
    });

    // If the execution reaches this line, the transaction has been committed successfully
    return res.status(200).end();
  } catch (error) {
    // If the execution reaches this line, an error occurred.
    // The transaction has already been rolled back automatically by Sequelize!
    return res.status(500).json(error.message);
  }
});

module.exports = router;
