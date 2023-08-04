// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import path, { dirname } from "path";
import { fileURLToPath } from 'url';

import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./gdpr.js";
import 'dotenv/config.js'

import Chat from './models/chat.js'
import Error from './models/error.js'
import User from './models/user.js'
import mongoose from 'mongoose'

mongoose.set('strictQuery', false)
const MONGODB_URI = process.env.MONGODB_URI
mongoose.connect(MONGODB_URI).then(()=>console.log('mongoose connected'))


import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

console.log('running on', PORT)
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();



// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
console.log(shopify.config.auth.callbackPath)
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '/privacy.html'))
})

const QUERY = `
  query {
    shop {
      id
    }
  }
`


const get_shop_info = async (client) => {
  const query = `
    query {
      shop {
        name
        currencyCode
        description
        myshopifyDomain
        allProductCategories {
          productTaxonomyNode {
            name
            fullName
          }
        }
        fulfillmentServices {
          serviceName
          handle
          type
        }
      }
    }
  `
  const response = await client.query({
    data: {
      query: query
    }
  })
  return response.body.data.shop
}

const get_products = async (client) => {
  const query = `
    query {
      products(first: 20, reverse: true) {
        edges {
          node {
            createdAt
            description
            handle
            id
            productCategory {
              productTaxonomyNode {
                fullName
                name
                id
              }
            }
            productType
            status
            title
            totalInventory
            totalVariants
          }
        }
      }
    }
  `
  const response = await client.query({
    data: {
      query: query
    }
  })
  console.log(response.body.data)
  return response.body.data
}

const functions = [
  {
    'name': 'get_shop_info',
    'description': 'returns the following information about users store: name, currencyCode, description, myshopifyDomain, allProductCategories, fulfillmentServices',
    'parameters': {
      'type': 'object',
      'properties': {}
    }
  },
  {
    'name': 'get_products',
    'description': 'returns a list products with following data about the product: createdAt, description, handle, id, productCategory, productType, status, title, totalInventory, totalVariants',
    'parameters': {
      'type': 'object',
      'properties': {}
    }
  },
]




app.post('/api/gpt', async (req, res) => {
  let shop_id
  let model
  let user
  let token_usage = 0

  const session = res.locals.shopify.session
  const client = new shopify.api.clients.Graphql({session})
  
  try {
    const response = await client.query({
      data: {
        query: QUERY
      }
    })

    shop_id = response.body.data.shop.id
  } catch {
    shop_id = 'could not find shop id'
  }

  if (Number(req.body.prevCompletionTokens) < 3800) {
    model = 'gpt-3.5-turbo-0613'
  } else {
    model = 'gpt-3.5-turbo-16k-0613'
  }

  try {
    const users = await User.find({})

    if (users.find(u => u.shop_id === shop_id)) {
      user = users.find(u => u.shop_id === shop_id)

      if (user === undefined) {
        throw 'error'
      }

      if (user.plan === 'none') {
        res.status(503).send({ error: 'token limit exceeded'})
        return
      }

      if (user.plan === 'trial' && user.trial_left === 0) {
        res.status(503).send({ error: 'token limit exceeded'})
        return
      }

      if (user.plan === 'old' ) {
        res.status(503).send({ error: 'token limit exceeded'})
        return
      }

      const last_reset = user?.last_reset.toString().substring(0,10)
      const current_date = new Date().toString().substring(0,10)

      if ( last_reset !== current_date ) {
        if (user.plan === 'trial') {
          if (user.trial_left === 0) {
            res.status(503).send({ error: 'token limit exceeded'})
            user.token_limit = 0
            user.save()
            return
          } else {
            user.trial_left -= 1
          }
        }
        user.reset_log.push({ date: new Date(), token_usage: user.token_usage })
        user.token_usage = 0
        user.last_reset = new Date()
      }

      if (user.token_usage >= user.token_limit) {
        res.status(503).send({ error: 'token limit exceeded'})
        return
      }
    } else {
      user = new User({
        shop_id: shop_id,
        plan: 'none',
        trial_left: 5,
        token_limit: 0,
        token_usage: 0,
        subscription_id: ''
      })
      res.status(503).send({ error: 'token limit exceeded'})
      user.save()
      return
    }
  } catch {
    res.status(500).send({ error: 'could not find user'})
    return
  }

  try {
    const completion = await openai.createChatCompletion({
      model: model,
      messages: req.body.chat,
      functions: functions
    })

    const response_message = completion.data.choices[0].message

    token_usage += completion.data.usage?.total_tokens


    if (response_message?.function_call) {
      const available_functions = {
        'get_shop_info': get_shop_info,
        'get_products': get_products
      }
      
      const function_name = response_message.function_call.name
      const function_to_call = available_functions[function_name]
      const function_response = await function_to_call(client)

      const messages = req.body.chat
      messages.push(response_message)
      messages.push({
        'role': 'function',
        'name': function_name,
        'content': JSON.stringify(function_response)
      })

      const secondCompletion = await openai.createChatCompletion({
        model: model,
        messages: messages,
      })

      token_usage += secondCompletion.data.usage?.total_tokens

      res.status(200).send({ 
        body: secondCompletion.data.choices[0].message,
        completionTokens: secondCompletion.data.usage?.total_tokens
      })
      const chat = new Chat({
        input_prompt: messages, 
        response: secondCompletion.data.choices[0].message,
        tokens_used: {
          prompt_tokens: completion.data.usage?.prompt_tokens + secondCompletion.data.usage?.prompt_tokens,
          completion_tokens: completion.data.usage?.completion_tokens + secondCompletion.data.usage?.completion_tokens,
          total_tokens: completion.data.usage?.total_tokens + secondCompletion.data.usage?.total_tokens,
        },
        shop_id: shop_id
      })
      chat.save()

    } else {
      res.status(200).send({ 
        body: completion.data.choices[0].message,
        completionTokens: completion.data.usage?.total_tokens
      })
      const chat = new Chat({
        input_prompt: req.body.chat, 
        response: completion.data.choices[0].message,
        tokens_used: completion.data.usage,
        shop_id: shop_id
      })
      chat.save()
    }
    
    user.token_usage += token_usage
    user.save()

  } catch {
    res.status(500).send({ error: 'could not respond'})
    const error = new Error({
      input_prompt: req.body.chat,
      shop_id: shop_id
    })
    try {
      await error.save()
    } catch {
      console.log('could not save chat')
    }
  }
})





app.get('/api/user', async (req, res) => {
  const session = res.locals.shopify.session
  const client = new shopify.api.clients.Graphql({session})
  let shop_id
  let user

  try {
    const response = await client.query({
      data: {
        query: QUERY
      }
    })

    shop_id = response.body.data.shop.id
  } catch {
    res.status(500).send()
    return
  }

  const planResponse = await client.query({
    data: {
      query: `
        query {
          currentAppInstallation {
            activeSubscriptions {
              name
              status
              test
            }
          }
        }
      `
    }
  })
  let currentPlan
  if(planResponse.body.data.currentAppInstallation.activeSubscriptions.length === 0) {
    currentPlan = 'no plan'
  } else {
    currentPlan = planResponse.body.data.currentAppInstallation.activeSubscriptions[0].name
  }

  try {
    const users = await User.find({})

    if (users.find(u => u.shop_id === shop_id)) {
      user = users.find(u => u.shop_id === shop_id)

      if (user === undefined) {
        throw 'error'
      }

      if (currentPlan !== 'no plan') {
        if (user.plan !== currentPlan) {
          user.plan_log.push({ action: `to ${currentPlan}`, date: new Date() })
        }
        user.plan = currentPlan
      } else {
        if (user.plan === 'basic' || user.plan === 'premium') {
          user.plan = 'old'
          user.plan_log.push({ action: 'to old', date: new Date() })
        }
      }

      switch (user.plan) {
        case 'none':
          user.token_limit = 0
          break
        case 'basic':
          user.token_limit = 50000
          break
        case 'premium':
          user.token_limit = 100000
          break
        case 'old':
          user.token_limit = 0
          break
      }

      const last_reset = user?.last_reset.toString().substring(0,10)
      const current_date = new Date().toString().substring(0,10)

      if ( last_reset !== current_date ) {
        if (user.plan === 'trial') {
          if (user.trial_left === 0) {
            user.token_limit = 0
          } else {
            user.trial_left -= 1
          }
        }

        user.reset_log.push({ date: new Date(), token_usage: user.token_usage })
        user.token_usage = 0
        user.last_reset = new Date()
      } else {
        if (user.plan === 'trial') {
          if (user.trial_left === 0) {
            user.token_limit = 0
          }
        }
      }

    } else {
      user = new User({
        shop_id: shop_id,
        plan: 'none',
        trial_left: 5,
        token_limit: 0,
        token_usage: 0,
        subscription_id: ''
      })
    }
    user.save()
  } catch {
    res.status(500).send({ error: 'could not find user'})
    return
  }

  res.status(200).send({ user: user })
})



app.post('/api/subscription/trial', async (req, res) => {
  const session = res.locals.shopify.session
  const client = new shopify.api.clients.Graphql({session})
  let shop_id
  let user

  try {
    const response = await client.query({
      data: {
        query: QUERY
      }
    })

    shop_id = response.body.data.shop.id
  } catch {
    res.status(500).send()
    return
  }

  try {
    const users = await User.find({})

    user = users.find(u => u.shop_id === shop_id)

    if (user === undefined) {
      throw 'error'
    }
    user.plan = 'trial'
    user.plan_log.push({ action: 'to trial', date: new Date() })
    user.token_usage = 0
    user.token_limit = 1000

    user.save()
  } catch {
    res.status(500).send({ error: 'could not find user'})
    return
  }

  res.status(200).send({ user: user })

})




app.post('/api/subscription/basic', async (req, res) => {
  const session = res.locals.shopify.session
  const client = new shopify.api.clients.Graphql({session})

  const urlResponse = await client.query({
    data: {
      query: `
        query {
          shop {
            myshopifyDomain
          }
        }
      `
    }
  })
  const url = urlResponse.body.data.shop.myshopifyDomain.slice(0, -14)

  const data = await client.query({
    data: {
      "query": `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: false) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
            status
          }
          confirmationUrl
        }
      }`,
      "variables": {
        "name": 'basic',
        "returnUrl": `https://admin.shopify.com/store/${url}/apps/gpt-assistant-1/plan`,
        "lineItems": [
          {
            "plan": {
              "appRecurringPricingDetails": {
                "price": {
                  "amount": 9.99,
                  "currencyCode": "USD"
                },
                "interval": "EVERY_30_DAYS"
              }
            }
          }
        ]
      },
    },
  });
  res.status(200).send({ url: data.body.data.appSubscriptionCreate.confirmationUrl})

  let shop_id
  let user

  try {
    const response = await client.query({
      data: {
        query: QUERY
      }
    })

    shop_id = response.body.data.shop.id
  } catch {
    return
  }

  try {
    const users = await User.find({})

    user = users.find(u => u.shop_id === shop_id)

    if (user === undefined) {
      throw 'error'
    }

    user.subscription_id = data.body.data.appSubscriptionCreate.appSubscription.id

    user.save()
  } catch {
    return
  }
})



app.post('/api/subscription/premium', async (req, res) => {
  const session = res.locals.shopify.session
  const client = new shopify.api.clients.Graphql({session})
  
  const data = await client.query({
    data: {
      "query": `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: false) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
            status
          }
          confirmationUrl
        }
      }`,
      "variables": {
        "name": 'premium',
        "returnUrl": "https://admin.shopify.com/store/quickstart-3920ea11/apps/gpt-assistant-1/plan",
        "lineItems": [
          {
            "plan": {
              "appRecurringPricingDetails": {
                "price": {
                  "amount": 18.99,
                  "currencyCode": "USD"
                },
                "interval": "EVERY_30_DAYS"
              }
            }
          }
        ]
      },
    },
  });
  res.status(200).send({ url: data.body.data.appSubscriptionCreate.confirmationUrl})

  let shop_id
  let user

  try {
    const response = await client.query({
      data: {
        query: QUERY
      }
    })

    shop_id = response.body.data.shop.id
  } catch {
    res.status(500).send()
    return
  }

  try {
    const users = await User.find({})

    user = users.find(u => u.shop_id === shop_id)

    if (user === undefined) {
      throw 'error'
    }

    user.subscription_id = data.body.data.appSubscriptionCreate.appSubscription.id

    user.save()
  } catch {
    res.status(500).send({ error: 'could not find user'})
    return
  }
})



app.get('/api/subscription/cancel', async (req, res) => {
  const session = res.locals.shopify.session
  const client = new shopify.api.clients.Graphql({session})

  let shop_id
  let user

  try {
    const response = await client.query({
      data: {
        query: QUERY
      }
    })

    shop_id = response.body.data.shop.id
  } catch {
    res.status(500).send()
    return
  }

  const users = await User.find({})
  user = users.find(u => u.shop_id === shop_id)

  await client.query({
    data: {
      "query": `mutation AppSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
            status
          }
        }
      }`,
      "variables": {
        "id": user?.subscription_id
      },
    },
  });

  user.subscription_id = ''
  user?.save()
})


app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
