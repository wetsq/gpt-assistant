import { useAuthenticatedFetch } from "@shopify/app-bridge-react";
import {
  Divider,
  TextField,
  Button,
  HorizontalStack,
  Scrollable,
  Form,
  Spinner,
  Banner
} from "@shopify/polaris";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { v4 as uuidv4} from 'uuid'

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    maxHeight: '100%'
}
const innerContainerStyle = {
  padding: '2%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  width: '100%',
  maxWidth: '800px',
}
const borderStyle = {
  padding: '2%',
  display: 'flex',
  flexDirection: 'column',
  borderStyle: 'solid',
  borderRadius: '10px',
  borderColor: 'rgba(256, 256, 256, 0)',
  borderWidth: '2px',
  boxShadow: 'rgba(100, 100, 111, 0.2) 0px 7px 29px 0px',
  gap: '5px',
  width: '100%',
  maxWidth: '800px',
  height: '100%',
  maxHeight: '100%',
  justifyContent: 'flex-end'
}
const boxStyle = {
  backgroundColor: 'rgb(202, 206, 211)',
  padding: '5px',
  borderRadius: '5px',
  flexGrow: '1',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  minHeight: '90vh'
}
const messageStyleL = {
  backgroundColor: 'rgba(35, 196, 140, 1)',
  width: '90%',
  margin: '1% 9% 1% 1%',
  padding: '1%',
  boxShadow: 'rgba(0, 0, 0, 0.15) 2px 2px 2.6px',
  borderRadius: '5px',
  whiteSpace: 'pre-line'
}
const messageStyleR = {
  backgroundColor: 'rgba(59, 195, 211, 1)',
  width: '90%',
  margin: '1% 1% 1% 9%',
  padding: '1%',
  boxShadow: 'rgba(0, 0, 0, 0.15) 2px 2px 2.6px',
  borderRadius: '5px',
  whiteSpace: 'pre-line'
}
const messageContainerR = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'end'
}
const messageTitleR = {
  paddingRight: '2%'
}
const messageContainerL = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'start'
}
const messageTitleL = {
  paddingLeft: '2%'
}

const defaultPrompt = [{'role': 'system', 'content': 'you are a helpful assistant for a shopify shop owner'}]
let chat = defaultPrompt

const Messages = ({ messages }) => {
  return(
    <>
    {
    messages.map(message => {
      if( message.origin === 'user' ) {
        return <div key={message.id} style={messageContainerR}><strong style={messageTitleR}>You</strong><div style={messageStyleR}>{`${message.message}`}</div></div>
      } else if ( message.origin === 'loading' ) {
        return <div key='loading' style={messageContainerL}><strong style={messageTitleL}>Assistant</strong><div style={{paddingLeft: '3%', paddingTop: '1%'}}><Spinner size="large" /></div></div>
      } else {
        return <div key={message.id} style={messageContainerL}><strong style={messageTitleL}>Assistant</strong><div style={messageStyleL}>{`${message.message}`}</div></div>
      }
    }) 
  }
  </>
  )
}

let prevCompletionTokens = 0

export default function HomePage() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [warning, setWarning] = useState(false)
  const fetch = useAuthenticatedFetch()

  const newMessage = async(origin, message) => {
    const newId = uuidv4()
    
    if (origin === 'user') {
      setMessages(prevMessages => [
      ...prevMessages,
      { id: newId, origin: origin, message: message},
      { origin: 'loading' }
    ])
    } else if (origin === 'warning') {
      setMessages(prevMessages => [
        ...prevMessages.filter(m => m.origin !== 'loading')
      ])
    } else {
      setMessages(prevMessages => [
      ...prevMessages.filter(m => m.origin !== 'loading'),
      { id: newId, origin: origin, message: message}
    ])
    }
    
    
    chat = chat.concat({'role': `${origin}`, 'content': `${message}`})
  }

  const handleClick = async() => {
    newMessage('user', prompt)
    setPrompt('')

    const response = await fetch('api/gpt', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat: chat, prevCompletionTokens: prevCompletionTokens})
    })
    const responseJson = await response.json()

    if (responseJson.body) {
      const gpt = responseJson.body
      prevCompletionTokens = responseJson.completionTokens
      newMessage('assistant', gpt.content)
    } else {
      if (responseJson.error === 'token limit exceeded') {
        setWarning('You are out of tokens, please check the plan page')
        newMessage('warning')
      } else {
        setWarning('Something went wrong, please reset and try again later')
        newMessage('warning')
      }
    }
  }

  const reset = () => {
    setMessages([])
    setWarning(false)
    chat = defaultPrompt
  }

  return (
    <div style={containerStyle}>
      <div style={innerContainerStyle}>
        <div style={borderStyle}>
            <Scrollable >
              <div style={boxStyle}>
                <Messages messages={messages} />
                { warning ? <Banner title='error' status="warning">{warning}</Banner> : null}
              </div>
            </Scrollable>
            <Divider borderColor="border-inverse"/>
            <Form onSubmit={handleClick}>
            <HorizontalStack wrap={false} gap='3' align="end">
              <div style={{ flexGrow: '1' }}>
                <TextField 
                value={prompt} 
                onChange={setPrompt} 
                placeholder="write your prompt here" 
                clearButton onClearButtonClick={() => setPrompt('')}
                disabled={warning}/>
              </div>
              <Button primary onClick={handleClick}>Send</Button>
              <Button onClick={reset}>Reset</Button>
            </HorizontalStack>
            </Form>
        </div>
      </div>
    </div>
  );
}
