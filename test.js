
async function f(collection){

    const nano = require('nano')('http://admin:Fcrlab2021!@pi2:5984');
    try{
        const permissions = nano.db.use(collection);
        let query = {
            "selector": {
                "_id": {
                    "$exists": true
                }
            }
        }
        const response = (await permissions.find(query)).docs;
        return response
    }catch{
        return []
    }
}

f()