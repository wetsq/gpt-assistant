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
  shop_id: {
    type: String
  }
})

export default mongoose.model('Error', schema)