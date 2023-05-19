const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5ickmg5.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;

    if(!authorization) return res.status(401).send({error: true, message: "Bad Authorization, Unauthorized Access"});

    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({error: true, message: "no verified token found. access denied"})
        }

        res.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const toyCollection = client.db('toyCluster').collection('toyCollection');

        app.post('/jwt', (req, res) => {
            const userEmail = req.body;
            const token = jwt.sign(userEmail, process.env.SECRET_KEY, { expiresIn: '1h' });
            res.send({token});
        });

        app.get('/toyCollection', async(req, res) => {
            const limitedTo = parseInt(req.query.limit);
            const result = await toyCollection.find().limit(limitedTo).toArray();
            res.send(result);
        });

        app.get('/toyCollection/:text', async(req, res) => {
            const searchedText = req.params.text;
            
            const result = await toyCollection.find({
                toyName: { $regex: searchedText, $options: "i" }
            }).toArray();

            res.send(result);
        });

        app.get('/toyCollectionBySubCategory/:text', async(req, res) => {
            const searchedText = req.params.text;
            
            const result = await toyCollection.find({
                subCategory: { $regex: searchedText, $options: "i" }
            }).toArray();

            res.send(result);
        });

        app.get('/singleToyDetail/:id', async(req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = {_id: new ObjectId(id)}

            const result = await toyCollection.findOne(query);
            console.log(result);
            res.send(result);
        });

        app.get('/userToys', verifyJWT, async(req, res) => {
            const decodedEmail = res.decoded.email;
            const userEmail = req.query.email;

            console.log(decodedEmail, userEmail);

            if (userEmail !== decodedEmail) return res.status(403).send({ error: 1, message: 'forbidden access' });

            let query = {};
            if(req.query?.email) {
                query = { sellerEmail: req.query.email };
            }

            const sortType = req.query.type === 'ascending';
            const value = req.query.value;
            const sortObj = {};
            sortObj[value] = sortType ? 1 : -1;

            const result = await toyCollection.find(query).sort(sortObj).toArray();
            res.send(result);
        });

        app.post('/addAToy', async(req, res) => {
            const addedData = req.body;
            const result = await toyCollection.insertOne(addedData);
            res.send(result);
        });

        app.patch('/toyCollection/:id', async(req, res) => {
            const id = req.params.id;
            const data = req.body;

            const filter = {_id: new ObjectId(id)};
            const updatedDoc = {
                $set: {
                    price: data.price,
                    avalaibleQuantity: data.avalaibleQuantity,
                    detailDescription: data.detailDescription
                }
            }

            const result = await toyCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.delete('/toyCollection/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await toyCollection.deleteOne(query);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Figurama Server is Running')
});

app.listen(port, () => {
    console.log(`Toy-Marketplace server is running on Port: ${port}`);
});