(function(){
    'use strict';

    let request = require('request');
    let _ = require('underscore');
    const SANDBOX_HOST = 'https://sandbox.glownet.com';
    const TICKET_TYPE_REF = 'ticket_type_ref';

    function mapObject(object, map){
        let retVal = {};
        Object.keys(map).forEach(function(key){
            retVal[key] = object[map[key]];
        });
        return retVal;
    }

    function Glownet(eventToken, companyToken, ticketTypeRefProperty, ticketTypeIdProperty, host){
        this.host = host || SANDBOX_HOST;
        this.ticketTypeIdProperty = ticketTypeIdProperty || 'glownetId';
        this.ticketTypeRefProperty = ticketTypeRefProperty || TICKET_TYPE_REF;
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
                    }, function (err, response, responseBody) {
                        if (err) {
                            console.error('Glownet.getTicketType', err);
                            reject(err);
                        } else {
                            ticketType[self.ticketTypeIdProperty] = responseBody.id;
                            resolve(responseBody);
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
                            newMap[newTicketType[self.ticketTypeRefProperty]] = newTicketType;
                        });
                        let promises = [];
                        old.ticket_types.forEach(function(oldTicketType){
                            if (!newMap[oldTicketType.ticket_type_ref]) {
                                // Missing in API
                                //promises.push(remove(oldTicketType))
                            } else {
                                if (newMap[oldTicketType.ticket_type_ref].name !== oldTicketType.name)
                                    promises.push(self.updateTicketType(oldTicketType.id, {
                                        name: newMap[oldTicketType.ticket_type_ref].name,
                                        ticket_type_ref: oldTicketType.ticket_type_ref
                                    }));

                                delete newMap[oldTicketType.ticket_type_ref];
                            }
                        });
                        promises.push.apply(promises, _.values(newMap).map(function(ticketType){
                            return self.addTicketType(mapObject(ticketType, {name: 'name', ticket_type_ref: self.ticketTypeRefProperty}));
                        }));
                        Promise.all(promises).then(function(){
                            resolve(Object.keys(newMap).length);
                        }, reject);
                    });
            });
        },
        bulkUploadTickets: function(tickets){
            let self = this;
            return new Promise(function(resolve, reject) {
                let invalid = [];
                let body = [];
                tickets.forEach(function(ticket, index){
                    'ticket_reference ticket_type_id'.split(' ').forEach(function (field) {
                        if (!ticket[field])
                            invalid.push(`Ticket.${index}.${field}`);
                    });
                    body.push(_.pick(ticket, 'ticket_reference', 'ticket_type_id', 'purchaser_attributes'));
                });
                if (invalid.length)
                    process.nextTick(reject, 'Missing field(s): ' + invalid.join(','));
                else
                    self.request.post(`${self.host}/companies/api/v1/tickets/bulk_upload`, {
                        body: {
                            tickets: body
                        }
                    }, function (err, response, responseBody) {
                        if (err) {
                            console.error('Glownet.getTicketType', err);
                            reject(err);
                        } else {
                            resolve(responseBody);
                        }
                    });
            });

        }
    };


    module.exports = Glownet;
})();