/*jshint esversion:6, node: true  */

class FetchTemplete {
    constructor(local) {
        this.local = local;
    }

    get(type, condition) {
        switch (type) {
            case 'routes':  // get route list

                break;
            case 'route':   // get specific route info

                break;
            default:

        }
    }

    getRouteList() {
        /*
        return [1, 2, 3]
        */
    }

    getRouteInfo(routeNo) {
        /*
        return {
            route: 160,
            name: '高鐵臺中站  -  僑光科技大學',
            start: '高鐵臺中站',
            end: '僑光科技大學',
            map: http://citybus.taichung.gov.tw/cms/api/route/160/map/18/image
            timetable: {
                weekday: []
                weekend: []
            }
        }
        */
    }

    getRouteStatus(routeNo) {
        /*
        return {
            arrival: [
                {stop: '環中向上路口(哈魚碼頭)', time: (new Date()).toJSON() }
            ]
            bus:[
                {plate: '287-U8', type: NULL, closestStop: 41, nextStop: 42, longitude: 120.642028, latitude: 24.17753, speed: NULL, lastUpdate: (new Date()).toJSON()}
            ]
        }
        */
    }
}

module.exports.FetchTemplete = FetchTemplete;
