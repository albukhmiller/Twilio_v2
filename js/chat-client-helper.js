'use strict';

import { Client as TwilioChatClient } from "twilio-chat";
import { Buffer } from "buffer";
import "react-native";

export default class ChatClientHelper {
  host;
  basicAuthHeaders;
  log;
  client;

  constructor(tokenAndConfigurationProviderHost, basicAuth, log) {
    this.host = tokenAndConfigurationProviderHost;
    if (basicAuth) {
      this.basicAuthHeaders =
        new Headers({
          "Authorization":
            `Basic ${Buffer.from(`${basicAuth.username}:${basicAuth.password}`).toString("base64")}`
        })
    }
    this.basicAuth = basicAuth;
    this.log = log;
    this.client = null;
  }

  login(identity, pushChannel, registerForPushCallback, showPushCallback) {
    let that = this;
    // let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0.eyJqdGkiOiJTSzlmZDlhNGIyZWM0ZDE3ZjhhN2Q4ZmI3N2MyZGY2NzYzLTE1ODkzNjY4MDgiLCJncmFudHMiOnsiaXBfbWVzc2FnaW5nIjp7InNlcnZpY2Vfc2lkIjoiSVMwYzhjMmNlZjM0YjU0MmQxYTkxMjhmYmI2YWE1OWM1OCIsImVuZHBvaW50X2lkIjoidHdpbGlvc2hhcnBkZXY6dW5kZWZpbmVkOnVuZGVmaW5lZCIsInB1c2hfY3JlZGVudGlhbF9zaWQiOiJDUjJkM2MxNWM1ZDQ1ZDU0ODRlZTA4MTE2NWJlOWMwYTNhIn19LCJpYXQiOjE1ODkzNjY4MDgsImV4cCI6MTU4OTM3MDQwOCwiaXNzIjoiU0s5ZmQ5YTRiMmVjNGQxN2Y4YTdkOGZiNzdjMmRmNjc2MyIsInN1YiI6IkFDY2Q4NWQyZjQyNTI1ZWIxMjIzZGE4MDFkNDI4Y2EzNTMifQ.Riu9YJwBLUdWRG3hF0ua1Y1zMKQjFhEitCfSrJqvfn4"
  //   fetch(`${this.host}/chat-client-configuration.json`, { headers: this.basicAuthHeaders })
  //     .then((response) => {
  //       let chatClientConfig = response.json();
  //       return TwilioChatClient.create(token, chatClientConfig.options || {}).then((chatClient) => {
  //         that.client = chatClient;
  //         that.client.on('tokenAboutToExpire', () => {
  //           that.getToken(identity, pushChannel)
  //             .then(newData => that.client.updateToken(newData))
  //             .catch((err) => {
  //               that.log.error('login', 'can\'t get token', err);
  //             })
  //         });
  //       })
  //     }).catch(error =>   that.log.error('login', 'can\'t get token', error));
  // }
  return fetch(`${ this.host }/chat-client-configuration.json`, { headers: this.basicAuthHeaders })
    .then((response) => {
      let chatClientConfig = response.json();
      that.log.info('login', 'Got Chat client configuration', chatClientConfig);
      return this.getToken(identity, pushChannel)
        .then(function(token) {
          that.log.info('ChatClientHelper', 'got chat token', token);
          return TwilioChatClient.create(token, chatClientConfig.options || {}).then((chatClient) => {
            that.client = chatClient;
            that.client.on('tokenAboutToExpire', () => {
              that.getToken(identity, pushChannel)
                .then(newData => that.client.updateToken(newData))
                .catch((err) => {
                  that.log.error('login', 'can\'t get token', err);
                })
            });
            that.client.on('pushNotification', obj => {
              if (obj && showPushCallback) {
                showPushCallback(that.log, obj);
              }
            });
            that.subscribeToAllChatClientEvents();
            if (registerForPushCallback) {
              registerForPushCallback(that.log, that.client);
            }
          });
        })
        .catch((err) => {
          that.log.error('login', 'can\'t get token', err);
        });
    })
    .catch((err) => {
      that.log.error('login', 'can\'t fetch Chat Client configuration', err);
    });

  }
  getToken(identity, pushChannel) {
    if (!pushChannel) {
      pushChannel = 'none';
    }
    return fetch(`https://turquoise-dotterel-7420.twil.io/chat-token?identity=someusername`)
      // { headers: this.basicAuthHeaders })
      .then(response => {
        that.log.error('TOKEN', response.text())
        return response.text()
      });
  }

  subscribeToAllChatClientEvents() {
    this.client.on('tokenAboutToExpire',
      obj => this.log.event('ChatClientHelper.client', 'tokenAboutToExpire', obj));
    this.client.on('tokenExpired', obj => this.log.event('ChatClientHelper.client', 'tokenExpired', obj));

    this.client.on('userSubscribed', obj => this.log.event('ChatClientHelper.client', 'userSubscribed', obj));
    this.client.on('userUpdated', obj => this.log.event('ChatClientHelper.client', 'userUpdated', obj));
    this.client.on('userUnsubscribed', obj => this.log.event('ChatClientHelper.client', 'userUnsubscribed', obj));

    this.client.on('channelAdded', obj => this.log.event('ChatClientHelper.client', 'channelAdded', obj));
    this.client.on('channelRemoved', obj => this.log.event('ChatClientHelper.client', 'channelRemoved', obj));
    this.client.on('channelInvited', obj => this.log.event('ChatClientHelper.client', 'channelInvited', obj));
    this.client.on('channelJoined', obj => {
      this.log.event('ChatClientHelper.client', 'channelJoined', obj);
      obj.getMessages(1).then(messagesPaginator => {
        messagesPaginator.items.forEach(message => {
          this.log.info('ChatClientHelper.client', obj.sid + ' last message sid ' + message.sid)
        })
      })
    });
    this.client.on('channelLeft', obj => this.log.event('ChatClientHelper.client', 'channelLeft', obj));
    this.client.on('channelUpdated', obj => this.log.event('ChatClientHelper.client', 'channelUpdated', obj));

    this.client.on('memberJoined', obj => this.log.event('ChatClientHelper.client', 'memberJoined', obj));
    this.client.on('memberLeft', obj => this.log.event('ChatClientHelper.client', 'memberLeft', obj));
    this.client.on('memberUpdated', obj => this.log.event('ChatClientHelper.client', 'memberUpdated', obj));

    this.client.on('messageAdded', obj => this.log.event('ChatClientHelper.client', 'messageAdded', obj));
    this.client.on('messageUpdated', obj => this.log.event('ChatClientHelper.client', 'messageUpdated', obj));
    this.client.on('messageRemoved', obj => this.log.event('ChatClientHelper.client', 'messageRemoved', obj));

    this.client.on('typingStarted', obj => this.log.event('ChatClientHelper.client', 'typingStarted', obj));
    this.client.on('typingEnded', obj => this.log.event('ChatClientHelper.client', 'typingEnded', obj));

    this.client.on('connectionStateChanged',
      obj => this.log.event('ChatClientHelper.client', 'connectionStateChanged', obj));

    this.client.on('pushNotification', obj => this.log.event('ChatClientHelper.client', 'onPushNotification', obj));
  }
};