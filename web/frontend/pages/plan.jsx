import { 
  AlphaCard, 
  Frame, 
  Layout, 
  Navigation, 
  Page, 
  ProgressBar, 
  Text, 
  VerticalStack,
  List,
  Divider,
  Button,
  Modal,
  Scrollable
 } from "@shopify/polaris";
import { useAuthenticatedFetch } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";



const InfoMessage = ({ user }) => {
  if (user.plan === 'trial') {
    if (user.trial_left === 0) {
      return(
        <div>{user.token_usage} / {user.token_limit} of daily tokens used, your free trial has ended</div>
      )
    }
    if (user.trial_left === 1) {
      return(
        <div>{user.token_usage} / {user.token_limit} of daily tokens used, this is the last day of your free trial</div>
      )
    }
    return(
      <div>{user.token_usage} / {user.token_limit} of daily tokens used{user.plan === 'trial' ? `, you have ${user.trial_left} days of your free trial left` : ''}</div>
    )
  }
  return(<div>{user.token_usage} / {user.token_limit} of daily tokens used</div>)
}

const PlanMessage = ({ user }) => {
  if (user.plan === 'none') {
    return (
      <Text variant="headingLg" as="h5">To begin, start your free trial or select one of the other plans below</Text>
    )
  }
  if (user.plan === 'old') {
    return (
      <Text variant="headingLg" as="h5">You don't have a plan, please select one below</Text>
    )
  }
  return(null)
}


export default function infoPage() {
  const fetch = useAuthenticatedFetch()
  const [usage, setUsage] = useState(0)
  const [user, setUser] = useState({plan: 'test'})
  const [confirm, setConfirm] = useState(false)
  let barColor = 'success'

  const getUser = async () => {
    let responseJson
    
    const response = await fetch('api/user', {
    method: 'GET',
    })

    try {
      responseJson = await response.json()
    } catch {
      const end = response.headers.get('x-shopify-api-request-failure-reauthorize-url')
      window.top.location.replace(`https://gpt-ai-assistant.fly.dev${end}`)
      return
    }
    

    const tempUser = responseJson.user
    if (tempUser.token_usage > tempUser.token_limit) {
      setUser({...tempUser, token_usage: tempUser.token_limit})
      tempUser.token_usage = tempUser.token_limit
    }
    setUser(tempUser)
    if (tempUser.token_limit === tempUser.token_usage) {
      setUsage(100)
    } else {
      setUsage(Math.round((tempUser.token_usage/tempUser.token_limit) * 100))
    }
  }


  const startTrial = async () => {
    await fetch('api/subscription/trial', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }
    })
    window.location.reload()
  }

  const handleBasic = async () => {
    const response = await fetch('api/subscription/basic', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    const responseJson = await response.json()
    
    window.top.location.replace(`${responseJson.url}`)
  }

  const handlePremium = async () => {
    const response = await fetch('api/subscription/premium', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    const responseJson = await response.json()
    window.top.location.replace(`${responseJson.url}`)
  }

  const cancelPlan = async () => {
    setConfirm(false)
    fetch('api/subscription/cancel', {
      method: 'GET'
    })
    window.location.reload()
  }

  const handleConfirm = () => {
    setConfirm(!confirm)
  }


  useEffect(() => {
    getUser()
  }, [])

  if (usage === 100) {
    barColor = 'critical'
  }

  return (
    <Scrollable>
    <Page>
      <Modal
        small
        open={confirm}
        titleHidden
        onClose={handleConfirm}
        primaryAction={{
          content: 'Confirm',
          onAction: cancelPlan
        }}
        secondaryActions={{
          content: 'Back',
          onAction: handleConfirm
        }}
        >
          <Modal.Section>
            Confirm that you want to cancel your subscription
          </Modal.Section>
        
      </Modal>
      <VerticalStack gap='5'>
      <Layout>
        <Layout.Section>
          <AlphaCard>
            <Text variant="headingXl" as="h4">
              Your token usage
            </Text>
            <br />
            <ProgressBar progress={usage} color={barColor}/>
            <div style={{height: '5px'}}></div>
            <InfoMessage user={user}/>

          </AlphaCard>
        </Layout.Section>
      </Layout>
      <PlanMessage user={user} />
      <Layout>
        <Layout.Section oneThird>
          <AlphaCard>
            <Text variant="headingXl" as="h4">
              Trial
            </Text>
            <div style={{height: '10px'}}></div>
            <Divider borderColor="border-inverse"/>
            <div style={{height: '5px'}}></div>
            <List type='bullet'>
              <List.Item>
                <Text variant="headingSm" as="h6">
                  Free for 5 days
                </Text>
              </List.Item>
              <List.Item>
                <Text variant="headingSm" as="h6">
                  1 000 Tokens/Day
                </Text>
              </List.Item>
            </List>
            <div style={{height: '10px'}}></div>
            {user.plan === 'none' && <Button size="large" fullWidth primary onClick={startTrial}>Start</Button>}
            {user.plan === 'trial' && <Button size="large" fullWidth primary disabled>Your plan</Button>}
            {user.plan === 'basic' && <Button size="large" fullWidth primary disabled>Used</Button>}
            {user.plan === 'premium' && <Button size="large" fullWidth primary disabled>Used</Button>}
            {user.plan === 'old' && <Button size="large" fullWidth primary disabled>Used</Button>}           
          </AlphaCard>
        </Layout.Section>

        <Layout.Section oneThird>
        <AlphaCard>
            <Text variant="headingXl" as="h4">
              Basic
            </Text>
            <div style={{height: '10px'}}></div>
            <Divider borderColor="border-inverse"/>
            <div style={{height: '5px'}}></div>
            <List type='bullet'>
              <List.Item>
                <Text variant="headingSm" as="h6">
                  $9.99/month
                </Text>
              </List.Item>
              <List.Item>
                <Text variant="headingSm" as="h6">
                  50 000 Tokens/Day
                </Text>
              </List.Item>
            </List>
            <div style={{height: '10px'}}></div>
            {user.plan === 'none' && <Button size="large" fullWidth primary onClick={handleBasic}>Select</Button>}
            {user.plan === 'basic' && <Button size="large" fullWidth destructive onClick={handleConfirm}>Cancel</Button>}
            {user.plan === 'trial' && <Button size="large" fullWidth primary onClick={handleBasic}>Upgrade</Button>}
            {user.plan === 'premium' && <Button size="large" fullWidth primary onClick={handleBasic}>Downgrade</Button>}
            {user.plan === 'old' && <Button size="large" fullWidth primary onClick={handleBasic}>Upgrade</Button>}
          </AlphaCard>
        </Layout.Section>

        <Layout.Section oneThird>
        <AlphaCard>
            <Text variant="headingXl" as="h4">
              Premium
            </Text>
            <div style={{height: '10px'}}></div>
            <Divider borderColor="border-inverse"/>
            <div style={{height: '5px'}}></div>
            <List type='bullet'>
              <List.Item>
                <Text variant="headingSm" as="h6">
                  $18.99/month
                </Text>
              </List.Item>
              <List.Item>
                <Text variant="headingSm" as="h6">
                  100 000 Tokens/Day
                </Text>
              </List.Item>
            </List>
            <div style={{height: '10px'}}></div>
            {user.plan === 'none' && <Button size="large" fullWidth primary onClick={handlePremium}>Select</Button>}
            {user.plan === 'basic' && <Button size="large" fullWidth primary onClick={handlePremium}>Upgrade</Button>}
            {user.plan === 'trial' && <Button size="large" fullWidth primary onClick={handlePremium}>Upgrade</Button>}
            {user.plan === 'premium' && <Button size="large" fullWidth destructive onClick={handleConfirm}>Cancel</Button>}
            {user.plan === 'old' && <Button size="large" fullWidth primary onClick={handlePremium}>Upgrade</Button>}
          </AlphaCard>
        </Layout.Section>
      </Layout>
      </VerticalStack>
    </Page>
    </Scrollable>
  )
}