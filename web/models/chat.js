import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  input_prompt: {
    type: Object
  },
  response: {
    type: Object
  },
  tokens_used: {
    type: Object
  },
  shop_id: {
    type: String
  }
})

export default mongoose.model('Chat', schema)