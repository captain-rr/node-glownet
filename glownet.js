(function(){
    'use strict';

    var request = require('request');
    var SANDBOX_HOST = 'https://sandbox.glownet.com';

    function Glownet(eventToken, companyToken, host){
        this.host = host || SANDBOX_HOST;
        this.request = request.defaults({
            json: true,
            auth: {
                user: eventToken,
                pass: companyToken
            },
            headers: {
                "cache-control": "no-cache"
            }
        })
    }

    Glownet.prototype = {
        getTicketType: function(){
            let self = this;
            return new Promise(function(resolve, reject){
                self.request.get(`${self.host}/companies/api/v1/ticket_types`, function(err, response, body){
                    if (err){
                        console.error('Glownet.getTicketType', err);
                        reject(err);
                    } else {
                        resolve(body);
                    }
                });
            });
        },
        addTicketType: function(ticketType){
            let self = this;
            return new Promise(function(resolve, reject) {
                let invalid = [];
                let body = {};
                'name ticket_type_ref'.split(' ').forEach(function (field) {
                    if (!ticketType[field])
                        invalid.push(field);
                    else
                        body[field] = ticketType[field];
                });
                if (invalid.length)
                    process.nextTick(reject, 'Missing field(s): ' + invalid.join(','));
                else
                    self.request.post(`${self.host}/companies/api/v1/ticket_types`, {
                        body: {
                            ticket_type: body
                        }
                    }, function (err, response, body) {
                        if (err) {
                            console.error('Glownet.getTicketType', err);
                            reject(err);
                        } else {
                            resolve(body);
                        }
                    });
            });
        },
        updateTicketType: function(id, ticketType){
            let self = this;
            return new Promise(function(resolve, reject){
                let invalid = [];
                let body = {};
                'name ticket_type_ref'.split(' ').forEach(function (field) {
                    if (!ticketType[field])
                        invalid.push(field);
                    else
                        body[field] = ticketType[field];
                });
                if (invalid.length)
                    process.nextTick(reject, 'Missing field(s): ' + invalid.join(','));
                else
                    self.request.patch(`${self.host}/companies/api/v1/ticket_types/${id}`, {
                        body: {
                            ticket_type: body
                        }
                    }, function (err, response, body) {
                        if (err) {
                            console.error('Glownet.getTicketType', err);
                            reject(err);
                        } else {
                            resolve(body);
                        }
                    });
            });
        },
        updateTicketTypes: function(newTicketTypes){
            let self = this;
            return new Promise(function(resolve, reject){
                self.getTicketType()
                    .then(function(old){
                        let newMap = {};
                        newTicketTypes.forEach(function(newTicketType){
                            newMap[newTicketType.ticket_type_ref] = newTicketType;
                        });
                        let promises = [];
                        old.ticket_types.forEach(function(oldTicketType){
                            if (!newMap[oldTicketType.ticket_type_ref]) {
                                // Missing in API
                                //promises.push(remove(oldTicketType))
                            } else {
                                if (newMap[oldTicketType.ticket_type_ref].name !== oldTicketType.name)
                                    promises.push(self.updateTicketType(oldTicketType.id, newMap[oldTicketType.ticket_type_ref]))

                                delete newMap[oldTicketType.ticket_type_ref];
                            }
                        });
                        Object.keys(newMap).map(function(newTicketType){
                            promises.push(self.addTicketType(newMap[newTicketType]));
                        });
                        Promise.all(promises).then(resolve, reject);
                    });
            });
        }
    };


    module.exports = Glownet;
})();