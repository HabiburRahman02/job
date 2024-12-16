const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000


// middleware
app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

const logger = (req, res, next) => {
    console.log('this is custom middleware(logger)');
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }

    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.user = decoded
        next();
    })
}

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

        // auth related apis
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '2h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false // only for localhost when deploy now set true
                })
                .send({ success: true });
        })
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
            if (email) {
                query = { hr_email: email }
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
        app.get('/applications/jobs/:job_id', async (req, res) => {
            const jobId = req.params.job_id;
            const query = { job_id: jobId }
            const result = await jobsApplicationCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/job-application', logger, verifyToken, async (req, res) => {
            const query = { applicant_email: req.query.email };

            if(req.user.email != req.query.email){
                return res.status(403).send({ message: 'Forbidden access' })
            }

            const result = await jobsApplicationCollection.find(query).toArray();
            console.log('job application ');
            for (const application of result) {
                const newQuery = { _id: new ObjectId(application.job_id) }
                const job = await jobsCollection.findOne(newQuery);
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

            const id = application.job_id;
            const query = { _id: new ObjectId(id) }
            const job = await jobsCollection.findOne(query)
            let newCount = 0;
            if (job.applicationCount) {
                newCount = job.applicationCount + 1
            }
            else {
                newCount = 1;
            }
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    applicationCount: newCount
                }
            }
            const jobResult = await jobsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.patch('/view-application/:id', async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updated = {
                $set: {
                    status: data.status
                }
            }
            const result = await jobsApplicationCollection.updateOne(filter, updated);
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