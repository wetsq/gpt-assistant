# GPT-Assistant

GPT-Assistant is as Shopify app that integrates ChatGPT with OpenAI API to the Shopify admin. Made with Shopify's app template.

Shopify app store listing: https://apps.shopify.com/gpt-assistant


### Front-end

The Front-end is a single page React-app that runs in an iframe on the Shopify admin. UI is developed with Shopifys front-end library Polaris with some custom elements added. Communicates with back-end through Shopifys authenticated fetch requests.

### Back-end

The Back-end uses Shopify APIs to fetch information about the users Shopify store through GraphQL endpoints. Back-end is based on the Node.js template. Back-end receives user input and forwards it to the OpenAIs API for a response. Users's usage of the endpoints are logged to a MongoDB database, that also logs any errors. Users usage limits are based on their subscription plan, that are controlled through Shopifys APIs.
