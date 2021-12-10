
const nano = require('nano')('http://admin:Fcrlab2021!@pi1:5984');

async function update_permission(path, roles)
{
    const q = {
        selector: {
            path: path
        },
        limit: 1
    };
    const permissions = nano.db.use('permissions');
    const response = await permissions.find(q)

    const doc = response.docs[0]
    console.log(doc)
    doc.roles = roles

    await permissions.insert(doc, doc._id)

    }
f(["moderator"])