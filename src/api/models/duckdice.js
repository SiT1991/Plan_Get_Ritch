'use strict';

import {BaseDice} from './base'
import fetch from 'isomorphic-fetch';
import FormData from 'form-data';
import {APIError} from '../errors/APIError'

export class DuckDice extends BaseDice {
    constructor(){
        super();
        this.url = 'https://duckdice.io';
        this.benefit = '&c=ab61534783'
    }

    async login(userName, password, twoFactor ,apiKey, req) {
        let ret = await this._send('stat/btc?api_key='+ apiKey, 'GET', '', '');
        req.session.accessToken = apiKey;
        req.session.username = apiKey;
        return true;
    }

    async getUserInfo(req) {
        return true
    }

    async refresh(req) {
        let formData = new FormData();
        let info = req.session.info;
        if(info){
            console.log("info is not null");
            return info;
        }
        let accessToken = req.session.accessToken;
        let ret = await this._send('stat/'+req.query.currency+'?api_key='+ accessToken, 'GET', '','');
        let userinfo = {};
        userinfo.bets = ret.bets;
        userinfo.wins = ret.wins;
        userinfo.losses = ret.bets - ret.wins;
        userinfo.profit = ret.profit;
        userinfo.wagered = ret.volume;
        ret = await this._send('load/'+req.query.currency+'?api_key='+ accessToken, 'GET', '','');
        userinfo.balance = ret.user.balance;
        userinfo.success = true;
        info.info = userinfo;
        req.session.info = info;
        return info;
    }

    async clear(req) {
        let accessToken = req.session.accessToken;
        let info = {};
        let ret = await this._send('stat/'+req.query.currency+'?api_key='+ accessToken, 'GET', '','');
        let userinfo = {};
        userinfo.bets = ret.bets;
        userinfo.wins = ret.wins;
        userinfo.losses = ret.bets - ret.wins;
        userinfo.profit = ret.profit;
        userinfo.wagered = ret.volume;
        ret = await this._send('load/'+req.query.currency+'?api_key='+ accessToken, 'GET', '','');
        userinfo.balance = ret.user.balance;
        userinfo.success = true;
        info.info = userinfo;
        info.currentInfo = {};
        info.currentInfo.balance = ret.user.balance;
        info.currentInfo.bets = 0;
        info.currentInfo.wins = 0;
        info.currentInfo.losses = 0;
        info.currentInfo.profit = 0;
        info.currentInfo.wagered = 0;
        req.session.info = info;
        return info;
    }

    async bet(req) {
        let data = {};
        let accessToken = req.session.accessToken; 
        data.amount = parseFloat(req.body.PayIn/100000000).toFixed(8);
        data.symbol = req.body.Currency.toLowerCase();
        let condition = req.body.High == "true"?true:false;
        let game = 0;
        if(req.body.High == "true"){
            game = 9999-Math.floor((req.body.Chance*100));
        } else {
            game = Math.floor((req.body.Chance*100))-1;
        }
        data.chance = parseFloat(req.body.Chance).toFixed(2);
        data.isHigh = condition;

        let ret = await this._send('play?api_key='+ accessToken, 'POST',data,'');
        let info = req.session.info;
        let betInfo = ret.bet;
        betInfo.condition = req.body.High == "true"?'>':'<';
        betInfo.id = betInfo.hash;
        betInfo.target = parseFloat(game/100).toFixed(2);;
        betInfo.result = parseFloat(betInfo.number/100).toFixed(2);
        betInfo.amount = betInfo.betAmount;
        info.info.bets++;
        info.currentInfo.bets++;
        info.info.profit = (parseFloat(info.info.profit) + parseFloat(betInfo.profit)).toFixed(8);
        info.info.balance = ret.user.balance;
        info.currentInfo.balance = ret.user.balance;
        info.info.wagered = (parseFloat(info.info.wagered) + parseFloat(betInfo.amount)).toFixed(8);
        info.currentInfo.wagered = (parseFloat(info.currentInfo.wagered) + parseFloat(betInfo.amount)).toFixed(8);
        info.currentInfo.profit = (parseFloat(info.currentInfo.profit) + parseFloat(betInfo.profit)).toFixed(8);
        if(betInfo.profit>0){
            betInfo.win = true;
            info.info.wins++;
            info.currentInfo.wins++;
        } else {
            betInfo.win = false;
            info.info.losses++;
            info.currentInfo.losses++;
        }
        let returnInfo = {};
        returnInfo.betInfo= betInfo;
        returnInfo.info = info;
        req.session.info = info;
        console.log(returnInfo.betInfo);
        return returnInfo;
    }

    async _send(route, method, body, accessToken){
        let url = `${this.url}/api/${route}${this.benefit}`;
        let res  = null;
        if(method == "POST"){
            res = await fetch(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'MyDiceBot',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        } else {
            res = await fetch(url, {
                method,
                headers: {
                    'User-Agent': 'MyDiceBot',
                },
            });
        }
        let data = await res.json();
        if (data.error) {
            let errs = new Error(data.error);
            errs.value = data.error;
            throw new APIError(data.error ,errs);
        }
        return data;
    }
}
