const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000


// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster3.ggy8e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster3`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const jobsCollection = client.db('job-portalDB').collection('jobs');
        const jobsApplicationCollection = client.db('job-portalDB').collection('job-applications');

        // jobs related apis
        app.get('/job/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            let query = {};
            if(email){
                query = {hr_email:email}
            }
            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/post-jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result)
        })


        // jobs application related apis
        app.get('/job-application', async (req, res) => {
            const query = { applicant_email: req.query.email };
            const result = await jobsApplicationCollection.find(query).toArray();

            for (const application of result) {
                const newQuery = { _id: new ObjectId(application.job_id) }
                const job = await jobsCollection.findOne(newQuery);
                console.log('job', job);
                console.log('application', application);
                if (job) {
                    application.title = job.title
                    application.company = job.company
                    application.company_logo = job.company_logo
                }
            }

            res.send(result);
        })

        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            const result = await jobsApplicationCollection.insertOne(application);
            res.send(result);
        })



        await client.connect();
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
    res.send('job portal is running......')
})

app.listen(port, () => {
    console.log(`job portal is running on port ${port}`)
})