import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  shop_id: {
    type: String
  },
  plan_log: {
    type: [Object]
  },
  plan: {
    type: String
  },
  subscription_id: {
    type: String
  },
  trial_left: {
    type: Number
  },
  token_limit: {
    type: Number
  },
  token_usage: {
    type: Number
  },
  last_reset: {
    type: Date,
    default: Date.now
  },
  reset_log: {
    type: [Object]
  }
})

export default mongoose.model('User', schema)