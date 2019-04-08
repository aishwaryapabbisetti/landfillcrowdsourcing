var express = require('express');
var mongoose = require('mongoose');
var userModel = require('../mongoModels/userModel');
var taskModel = require('../mongoModels/taskModel');
var campaignModel = require('../mongoModels/campaignModel');
var imageModel = require('../mongoModels/imageModel');
var generatePresignedUrl = require('../s3/generatePresignedUrl');
var request = require('request');
var axios = require('axios');
var router = express.Router();

const getUserFromToken = async (token) => {
  return await userModel.findById(token); 
}

router.get('/', async function (req, res, nxt) {
  res.render('register');
});

router.post('/registration', async function (req, res, nxt) {
  const user = new userModel();
  user._id = new mongoose.Types.ObjectId();
  user.username = req.body.username;
  user.fullname = req.body.fullname;
  user.password = req.body.password;
  user.userType = req.body.userType;
  await user.save();
  console.log('user registered');
  res.redirect('/login');
});

router.get('/login', async function (req, res, nxt) {
  res.render('login');
});

router.post('/loginAction', async function (req, res, nxt) {
  const user = await userModel.findOne({
    username: req.body.username,
    password: req.body.password
  });
  if (!user)
    res.render('error', { message: 'User not found or wrong creds' });
  console.log('user logged in');
  const token = user._id;
  res.redirect(`profile?token=${token}`);
});

router.get('/profile', async function (req, res, net) {
  const token = req.query.token;
  const user = await getUserFromToken(token);
  if (!user) 
    res.render('error', {message: 'user not found, login again'});
  const createCampaign = `/createCampaign?token=${token}`;
  const campaignList = `/campaignlist?token=${token}`;
  const viewTasks = `/viewTasks?token=${token}`;
  res.render('profile', { user, token, isManager: user.userType == 'Manager', createCampaign, campaignList, viewTasks });
});

router.get('/createCampaign', async function(req, res, nxt) {
  const token = req.query.token;
  const user = await getUserFromToken(token);
  if (!user) 
    res.render('error', {message: 'user not found, login again'});
  if (user.userType != 'Manager')
    res.render('error', {message: 'Access Denied'});
  const workers = await userModel.find({userType: 'Worker'});
  const profile = `/profile?token=${token}`;
  const campaignlist = `/campaignlist?token=${token}`;
  res.render('mastercreatecampaign', {workers, token, profile, campaignlist});
})

router.post('/createCampaign', async function (req, res, nxt) {
  const token = req.body.token;
  const manager = await getUserFromToken(token);
  if (!manager) 
    res.render('error', {message: 'user not found, login again'});
  console.log(req.body);
  const images = [];
  const urls = await getPresignedUrl(req.body.images);
  const campaignId = new mongoose.Types.ObjectId();
  for (var i = 0; i < urls.length; ++i) {
    const image = new imageModel();
    image.url = urls[i];
    image._id = new mongoose.Types.ObjectId();
    image.user = manager._id,
    image.campaign = campaignId;
    await image.save();
    images.push(image._id);
  }
  const campaign = new campaignModel();
  campaign._id = campaignId;
  campaign.manager = manager;
  campaign.campaignName = req.body.campaignName;
  campaign.selectionWorkers = req.body.selectionWorkers;
  campaign.annotationWorkers = req.body.annotationWorkers;
  campaign.images = images;
  campaign.selectionThreshold = req.body.selectionThreshold;
  campaign.annotationSize = req.body.annotationSize;
  campaign.status = 'Created';
  await campaign.save();

  const workers = campaign.selectionWorkers.length ? 
                  campaign.selectionWorkers : campaign.annotationWorkers;

  const type = campaign.selectionWorkers.length ? 'Selection' : 'Annotation';
  for (var i = 0 ; i < workers.length; ++i) {
    const task = new taskModel();
    task._id = new mongoose.Types.ObjectId();
    task.userId = workers[i];
    task.type = type;
    task.campaign = campaign._id;
    task.status = 'Pending';
    await task.save();
  }
  res.redirect(`/campaignlist?token=${token}`);
});

router.get('/campaignlist', async function (req, res, nxt) {
  const token = req.query.token;
  const manager = await getUserFromToken(token);
  if (!manager) 
    res.render('error', {message: 'user not found, login again'});
  const campaigns = await campaignModel.find({ manager: manager._id });
  let campaignList = [];
  for (var i = 0; i < campaigns.length; ++i) {
    const campaign = campaigns[i];
    const images = [];
    for (var j = 0; j < campaign.images.length; ++j) {
      const imageId = campaign.images[j];
      const image = await imageModel.findById(imageId);
      const children = [];
      for (var k = 0; k < image.children.length; ++k) {
        const childId = image.children[k];
        const child = await imageModel.findById(childId);
        children.push(child.url);
      }
      images.push({
        url: image.url,
        children,
        selectionCount: image.selectionCount
      });
    }
    const selectedWorkers = [];
    for (var j = 0; j < campaign.selectionWorkers.length; ++j) {
      const workerId = campaign.selectionWorkers[j];
      const worker = await userModel.findById(workerId);
      selectedWorkers.push(worker.fullname);
    }
    const annotatedWorkers = [];
    for (var j = 0; j < campaign.annotationWorkers.length; ++j) {
      const workerId = campaign.annotationWorkers[j];
      const worker = await userModel.findById(workerId);
      annotatedWorkers.push(worker.fullname);
    }
    campaignList.push({
      campaignName: campaign.campaignName,
      images,
      selectedWorkers,
      annotatedWorkers,
      status: campaign.status
    })
  }
  const profile = `/profile?token=${token}`;
  const createCampaign = `/createCampaign?token=${token}`;
  res.render('masterviewcampaigns', { campaignList, token, profile, createCampaign });
});

router.get('/viewtasks', async function (req, res, nxt) {
  const token = req.query.token;
  const worker = await getUserFromToken(token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  let tasks = await taskModel.find({
    userId: worker._id,
    taskType: 'Selection'
  });
  const selectionTasks = [];
  for (var i = 0; i < tasks.length; ++i) {
    const task = tasks[i];
    const campaign = await campaignModel.findById(task.campaign);
    selectionTasks.push({
      taskName: campaign.campaignName,
      totalImages: campaign.images.length,
      taskType: task.taskType,
      status: task.status,
      perform: task.status == 'Pending' ? `/performSelectionTasks/${task._id}?token=${token}` : ''
    });
  }
  tasks = await taskModel.find({
    userId: worker._id,
    taskType: 'Annotation'
  });
  const annotationTasks = [];
  for (var i = 0; i < tasks.length; ++i) {
    const task = tasks[i];
    const campaign = await campaignModel.findById(task.campaign);
    annotationTasks.push({
      taskName: campaign.campaignName,
      totalImages: campaign.images.length,
      taskType: task.taskType,
      status: task.status,
      perform: task.status == 'Pending' ? `/performAnnotationTasks/${task._id}?token=${token}` : ''
    });
  }
  const profile = `/profile?token=${token}`
  res.render('workerviewtasks', {
    selectionTasks,
    annotationTasks,
    token,
    profile
  });
});

router.get('/performSelectionTasks/:taskId', async function (req, res, nxt) {
  const token = req.query.token;
  const worker = await getUserFromToken(token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  const taskId = req.params.taskId;
  const task = await taskModel.findById(taskId);
  const campaign = await campaignModel.findById(task.campaign);
  var images = [];
  for (var i = task.imagesSelected.length + task.imagesNotSelected.length; i<=campaign.images.length;++i) {
    image = await imageModel.findById(campaign.images[i]); 
    if(image)
      images.push(image); 
  }

  res.render('performSelectiontask', {images, token, task, campaign});
});

router.post('/operateSelectionImage', async function (req, res, nxt){
  const worker = await getUserFromToken(req.body.token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  console.log(req.body);
  const imageId = req.body.imageId;
  const task = await taskModel.findById(req.body.taskId);
  req.body.answer ? task.imagesSelected.push(imageId) : task.imagesNotSelected.push(imageId);
  await task.save();
  if (req.body.answer) {
    const image = imageModel.findById(imageId);
    image.selectionCount += 1;
    image.save();
  }
  const campaign = await campaignModel.findById(task.campaign);
  campaign.status = 'Selection in Progess';
  await campaign.save();
  res({
    status: 'success'
  })
});

router.post('/finishSelectionTask', async function (req, res, nxt){
  const worker = await getUserFromToken(req.body.token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  const task = await taskModel.findById(req.body.taskId);
  task.status = 'Executed';
  task.save();
  const campaign = await campaignModel.findById(task.campaign);
  const tasks = await taskModel.find({
    campaign,
    taskType: 'Pending'
  });
  if (tasks && tasks.length == 0) {
    campaign.status = 'Annotation in Progress';
    for (var i = 0 ; i < campaign.annotationWorkers.length; ++i) {
      const task = new taskModel();
      task._id = new mongoose.Types.ObjectId();
      task.worker = campaign.annotationWorkers[i];
      task.type = 'Annotation';
      task.campaign = campaign._id;
      task.status = 'Pending';
      await task.save();
    }
  }
  res({
    status: 'success'
  })
});

router.get('/performAnnotationTasks/:taskId', async function (req, res, nxt) {
  const token = req.query.token;
  const worker = await getUserFromToken(token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  const taskId = req.params.taskId;
  const task = await taskModel.findById(taskId);
  const campaign = await campaignModel.findById(task.campaign);
  const annotationSize = campaign.annotationSize;
  (annotationSize!=null)?annotationSize:annoataionSize= 3;
  let images = await imageModel.find({
    campaign
  });
  images = images.filter((image) => {
    return image.selectionCount >= campaign.selectionThreshold;
  })
  for (var i = task.imagesAnnonated.length; i < campaign.images.length; ++i) {
    images.push(await imageModel.findById(campaign.images[i]));
  }
  res.render('performAnnotationtask', {images, token, annotationSize});
});

router.post('/operateAnnotationImage', async function (req, res, nxt){
  const worker = await getUserFromToken(req.body.token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  const imageId = req.body.imageId;
  const imageUrl = req.body.imageUrl; // canvas presigned url
  const task = await taskModel.findById(req.body.taskId);
  task.imagesAnnonated.push(imageId);
  await task.save();
  const newImage = new imageModel();
  newImage.url = imageUrl;
  newImage._id = new mongoose.Types.ObjectId();
  newImage.user_id = worker._id;
  await image.save();
  let image = await imageModel.findById(imageId);
  image.children.push(newImage._id);
  await image.save();
  res({
    status: 'success'
  })
});

router.post('/finishAnnotationTask', async function (req, res, nxt){
  const worker = await getUserFromToken(req.body.token);
  if (!worker) 
    res.render('error', {message: 'user not found, login again'});
  const task = await taskModel.findById(req.body.taskId);
  task.status = 'Executed';
  task.save();
  const campaign = await campaignModel.findById(task.campaign);
  const tasks = await taskModel.find({
    campaign,
    taskType: 'Pending'
  });
  if (tasks && tasks.length == 0) {
    campaign.status = 'Done';
  }
  res({
    status: 'success'
  })
});

const getPresignedUrl = async (files) => {
  try {
    var urls = [];
    for (var i = 0; i < files.length; ++i) {
      var file = files[i];
      // console.log(file, typeof file);
      // const { url } = await generatePresignedUrl(file.type, file.name);
      // await axios.put(url, options.file, {
      //   headers: {
      //     'Content-Type': options.file.type
      //   }
      // });
      urls.push(`www.${file}.com`);
    }
    console.log(urls);
    return urls;
  } catch (err) {
    console.log(err);
    res.render('error', { message: err.message });
  }
};

module.exports = router;
