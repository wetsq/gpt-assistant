import { AlphaCard, Link, List, Page, Scrollable, Text } from "@shopify/polaris";



export default function InfoPage() {
  return(
    <Scrollable>
    <Page narrowWidth>
      <AlphaCard>
        <Text variant="heading2xl" as="h3">Get started</Text>
        <div style={{height: '10px'}}></div>
        <Text variant="bodyLg" as="p">
        Welcome to the GPT-Assistant App! 
        To begin, please visit our plan-page and choose the subscription plan 
        that best suits your needs. If you're not quite ready for a paid plan, 
        feel free to start your free trial to experience the assistant with limited usage. 
        Our paid plans come with higher usage limits which you can also see on the plan-page. 
        We're here to assist you, so don't hesitate to ask any questions or
          seek help during your subscription.
        </Text>
        <div style={{height: '20px'}}></div>
        <Text variant="headingXl" as="h4">
          About GPT-Assistant
        </Text>
        <div style={{height: '10px'}}></div>
        <Text variant="bodyLg" as="p">
        The GPT-Assistant utilizes OpenAI's powerful GPT-3 AI model to 
        comprehend and provide responses to your prompts. This Assistant 
        retains the context of your ongoing conversation, making the interaction 
        more seamless and relevant.
        <br />
        <br />
        If you want to start fresh or remove the current context, simply use the reset-button. 
        The conversation resets when you leave the Assistant-page, if you want to keep the conversation open, 
        make sure to open other pages in new tabs or windows.
        <br />
        <br />
        While the Assistant can access some basic information about your store, 
        its primary purpose is to offer valuable information, guidance, and answer any 
        questions you may have based on your prompts. Feel free to ask anything you need 
        assistance with!
        </Text>
        <div style={{height: '20px'}}></div>
        <Text variant="headingXl" as="h4">
          Tokens
        </Text>
        <div style={{height: '10px'}}></div>
        <Text variant="bodyLg" as="p">
        The usage limits of our service are determined by counting tokens. Tokens are defined according to OpenAI's token system. 
        You can find more information about tokens in the provided link:&nbsp;
        <Link url='https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them'>OpenAi's tokens</Link>
        .
        <br />
        <br />
        To keep track of your token usage and limit, you can refer to the Plan-page. 
        Your daily token usage is reset every day at 00:00 UTC+0, allowing you to start 
        fresh for each new day.
        </Text>
        <div style={{height: '30px'}}></div>
        <Link url="https://gpt-ai-assistant.fly.dev/privacy">Privacy policy</Link>
      </AlphaCard>
    </Page>
    </Scrollable>
  )
}