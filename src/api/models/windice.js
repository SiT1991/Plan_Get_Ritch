'use strict';

import {BaseDice} from './base'
import fetch from 'isomorphic-fetch';
import FormData from 'form-data';
import {APIError} from '../errors/APIError';
import querystring from 'querystring';

export class WinDice extends BaseDice {
    constructor(){
        super();
        this.url = 'https://windice.io/';
        this.benefit = '&r=16392656'
    }

    async login(userName, password, twoFactor ,apiKey, req) {
        let ret = await this._send('/api/v1/api/user', 'GET', '', apiKey);
        req.session.accessToken = apiKey;
        req.session.username = ret.username;
        return true;
    }

    async getUserInfo(req) {
        return true
    }

    async refresh(req) {
        let info = req.session.info;
        if(info){
            console.log("info is not null");
            return info;
        }
        let accessToken = req.session.accessToken;
        let currency = req.query.currency;
        let ret = await this._send('/api/v1/api/stats', 'GET', '', accessToken);
        let userinfo = {};
        userinfo.bets = ret.stats.bets;
        userinfo.wins = ret.stats.wins;
        userinfo.losses = ret.stats.loses;
        userinfo.profit = 0;
        userinfo.wagered = 0;
        let statistics =  ret.statistics;
        statistics.forEach(function (value) {
            console.log(value, currency);
            if(value.curr == currency){
                userinfo.profit = parseFloat(value.profit).toFixed(8);
                userinfo.wagered = parseFloat(value.bet).toFixed(8);
            }
        });
        ret = await this._send('/api/v1/api/user', 'GET', '', accessToken);
        userinfo.balance = parseFloat(eval("ret.balance."+currency)/100000000).toFixed(8);
        userinfo.success = true;
        info.info = userinfo;
        req.session.info = info;
        return info;
    }

    async clear(req) {
        let accessToken = req.session.accessToken;
        let currency = req.query.currency;
        let info = {};
        let ret = await this._send('/api/v1/api/stats', 'GET', '', accessToken);
        console.log(ret);
        let userinfo = {};
        userinfo.bets = ret.stats.bets;
        userinfo.wins = ret.stats.wins;
        userinfo.losses = ret.stats.loses;
        userinfo.profit = 0;
        userinfo.wagered = 0;
        let statistics =  ret.statistics;
        statistics.forEach(function (value) {
            console.log(value, currency);
            if(value.curr == currency){
                userinfo.profit = parseFloat(value.profit).toFixed(8);
                userinfo.wagered = parseFloat(value.bet).toFixed(8);
            }
        });
        ret = await this._send('/api/v1/api/user', 'GET', '', accessToken);
        console.log(ret);
        userinfo.balance = parseFloat(eval("ret.balance."+currency)).toFixed(8);
        userinfo.success = true;
        info.info = userinfo;
        info.currentInfo = {};
        info.currentInfo.balance = parseFloat(eval("ret.balance."+currency)).toFixed(8);
        info.currentInfo.bets = 0;
        info.currentInfo.wins = 0;
        info.currentInfo.losses = 0;
        info.currentInfo.profit = 0;
        info.currentInfo.wagered = 0;
        req.session.info = info;
        console.log(info);
        return info;
    }

    async bet(req) {
        let accessToken = req.session.accessToken;
        let amount = parseFloat(req.body.PayIn/100000000);
        let currency = req.body.Currency.toLowerCase();
        let condition = req.body.High == "true"?"out":"in";
        let game = 0;
        let data = {};
        if(req.body.High == "true"){
            game = 9999-Math.floor((req.body.Chance*100))+1;
        } else {
            game = Math.floor((req.body.Chance*100))-1;
        }
        data.curr = currency;
        data.bet = amount;
        data.game = condition;
        data.low = 0;
        data.high = game;
        let ret = await this._send('/api/v1/api/roll', 'POST', data, accessToken);
        console.log(ret);
        let info = req.session.info;
        let betInfo = {};
        betInfo.condition = req.body.High == "true"?'>':'<';
        betInfo.id = '<a href="https://windice.io/api/v1/api/getBet?hash='+ret.hash+'" target="_blank">'+ret.hash+'</a>';
        betInfo.target = ret.chance;
        betInfo.roll = parseFloat(ret.result/100).toFixed(2);
        betInfo.amount = amount.toFixed(8);
        betInfo.payout = parseFloat(ret.payout/10000000).toFixed(11);
        info.info.bets++;
        info.currentInfo.bets++;
        betInfo.profit = parseFloat(ret.win-ret.bet).toFixed(8);
        if(ret.win >0){
            betInfo.win = true;
            info.info.wins++;
            info.currentInfo.wins++;
        } else {
            betInfo.win = false;
            info.info.losses++;
            info.currentInfo.losses++;
        }
        console.log(betInfo);
        info.info.profit = (parseFloat(info.info.profit) + parseFloat(betInfo.profit)).toFixed(8);
        info.info.balance = (parseFloat(info.info.balance) + parseFloat(betInfo.profit)).toFixed(8);
        info.currentInfo.balance = (parseFloat(info.currentInfo.balance) + parseFloat(betInfo.profit)).toFixed(8);
        info.info.wagered = (parseFloat(info.info.wagered) + parseFloat(betInfo.amount)).toFixed(8);
        info.currentInfo.wagered = (parseFloat(info.currentInfo.wagered)+parseFloat(betInfo.amount)).toFixed(8);
        info.currentInfo.profit = (parseFloat(info.currentInfo.profit)+parseFloat(betInfo.profit)).toFixed(8);
        let returnInfo = {};
        returnInfo.betInfo= betInfo;
        returnInfo.info = info;
        req.session.info = info;
        console.log(returnInfo);
        return returnInfo;
    }

    async _send(route, method, body, accessToken){
        let url = `${this.url}/${route}`;
        let res = await fetch(url, {
            method,
            headers: {
                'User-Agent': 'MyDiceBot',
                'Authorization': accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        let data = await res.json();
        if(data.status == 'error') {
            let errs = new Error(data.message);
            errs.value = data.message;
            throw new APIError(data.message ,errs);
        }
        let ret = data.data;
        return ret;
    }
}
