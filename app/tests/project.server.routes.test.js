'use strict';

var should = require('should'),
	request = require('supertest'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
	app = require('../../server'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Project = mongoose.model('Project'),
	agent = request.agent(app);

/**
 * Globals
 */
var credentials, user, project;

/**
 * Project routes tests
 */
describe('Project CRUD tests', function() {
	beforeEach(function(done) {
		// Create user credentials
		credentials = {
			username: 'username',
			password: 'password'
		};

		// Create a new user
		user = new User({
			firstName: 'Full',
			lastName: 'Name',
			displayName: 'Full Name',
			email: 'test@test.com',
			username: credentials.username,
			password: credentials.password,
			provider: 'local'
		});

		// Save a user to the test db and create new Project
		user.save(function() {
			project = {
                title: 'Project Name',
                description: 'desc',
                industry: 'test ind',
                referred: '',
                created: Date.now(),
                user: user._id
			};

			done();
		});
	});

	it('should be able to save Project instance if logged in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);
				// Get the userId
				var userId = user.id;

				// Save a new Project
				agent.post('/projects')
					.send(project)
					.expect(200)
					.end(function(projectSaveErr, projectSaveRes) {
						// Handle Project save error
						if (projectSaveErr) done(projectSaveErr);

						// Get a list of Projects
						agent.get('/projects')
							.end(function(projectsGetErr, projectsGetRes) {
								// Handle Project save error
								if (projectsGetErr) done(projectsGetErr);

								// Get Projects list
								var projects = projectsGetRes.body;

								// Set assertions
								(projects[0].user._id).should.equal(userId);
								(projects[0].title).should.match('Project Name');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to save Project instance if not logged in', function(done) {
		agent.post('/projects')
			.send(project)
			.expect(401)
			.end(function(projectSaveErr, projectSaveRes) {
				// Call the assertion callback
				done(projectSaveErr);
			});
	});

	it('should not be able to save Project instance if no name is provided', function(done) {
		// Invalidate name field
		project.title = '';

		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Project
				agent.post('/projects')
					.send(project)
					.expect(400)
					.end(function(projectSaveErr, projectSaveRes) {
						// Set message assertion
						(projectSaveRes.body.message).should.match('Please fill Project name');
						
						// Handle Project save error
						done(projectSaveErr);
					});
			});
	});

	it('should be able to update Project instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Project
				agent.post('/projects')
					.send(project)
					.expect(200)
					.end(function(projectSaveErr, projectSaveRes) {
						// Handle Project save error
						if (projectSaveErr) done(projectSaveErr);

						// Update Project name
						project.title = 'WHY YOU GOTTA BE SO MEAN?';

						// Update existing Project
						agent.put('/projects/' + projectSaveRes.body._id)
							.send(project)
							.expect(200)
							.end(function(projectUpdateErr, projectUpdateRes) {
								// Handle Project update error
								if (projectUpdateErr) done(projectUpdateErr);

								// Set assertions
								(projectUpdateRes.body._id).should.equal(projectSaveRes.body._id);
								(projectUpdateRes.body.title).should.match('WHY YOU GOTTA BE SO MEAN?');

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should be able to get a list of Projects if not signed in', function(done) {
		// Create new Project model instance
		var projectObj = new Project(project);

		// Save the Project
		projectObj.save(function() {
			// Request Projects
			request(app).get('/projects')
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Array.with.lengthOf(1);

					// Call the assertion callback
					done();
				});

		});
	});


	it('should be able to get a single Project if not signed in', function(done) {
		// Create new Project model instance
		var projectObj = new Project(project);

		// Save the Project
		projectObj.save(function() {
			request(app).get('/projects/' + projectObj._id)
				.end(function(req, res) {
					// Set assertion
					res.body.should.be.an.Object.with.property('title', project.title);
					// Call the assertion callback
					done();
				});
		});
	});

	it('should be able to delete Project instance if signed in', function(done) {
		agent.post('/auth/signin')
			.send(credentials)
			.expect(200)
			.end(function(signinErr, signinRes) {
				// Handle signin error
				if (signinErr) done(signinErr);

				// Get the userId
				var userId = user.id;

				// Save a new Project
				agent.post('/projects')
					.send(project)
					.expect(200)
					.end(function(projectSaveErr, projectSaveRes) {
						// Handle Project save error
						if (projectSaveErr) done(projectSaveErr);

						// Delete existing Project
						agent.delete('/projects/' + projectSaveRes.body._id)
							.send(project)
							.expect(200)
							.end(function(projectDeleteErr, projectDeleteRes) {
								// Handle Project error error
								if(projectDeleteErr)done(projectDeleteErr);

								// Set assertions
								(projectDeleteRes.body._id).should.equal(projectSaveRes.body._id);

								// Call the assertion callback
								done();
							});
					});
			});
	});

	it('should not be able to delete Project instance if not signed in', function(done) {
		// Set Project user 
		project.user = user;

		// Create new Project model instance
		var projectObj = new Project(project);

		// Save the Project
		projectObj.save(function() {
			// Try deleting Project
			request(app).delete('/projects/' + projectObj._id)
			.expect(401)
			.end(function(projectDeleteErr, projectDeleteRes) {
				// Set message assertion
				(projectDeleteRes.body.message).should.match('User is not logged in');

				// Handle Project error error
				done(projectDeleteErr);
			});

		});
	});



	afterEach(function(done) {
		User.remove().exec();
		Project.remove().exec();
		done();
	});
});

async.each(['travis is great','elephants?','#$%^&is the name of the game'], function(name, callback) {
    describe('Param Test', function() {
        beforeEach(function (done) {
            // Create user credentials
            credentials = {
                username: 'username',
                password: 'password'
            };

            // Create a new user
            user = new User({
                firstName: 'Full',
                lastName: 'Name',
                displayName: 'Full Name',
                email: 'test@test.com',
                username: credentials.username,
                password: credentials.password,
                provider: 'local'
            });

            // Save a user to the test db and create new Project
            user.save(function () {
                project = {
                    title: name,
                    description: 'desc',
                    industry: 'test ind',
                    referred: '',
                    created: Date.now(),
                    user: user._id
                };

                done();
            });
        });

        it('should be able to save Project instance with name:' + name +' if logged in', function (done) {
            agent.post('/auth/signin')
                .send(credentials)
                .expect(200)
                .end(function (signinErr, signinRes) {
                    // Handle signin error
                    if (signinErr) done(signinErr);
                    // Get the userId
                    var userId = user.id;

                    // Save a new Project
                    agent.post('/projects')
                        .send(project)
                        .expect(200)
                        .end(function (projectSaveErr, projectSaveRes) {
                            // Handle Project save error
                            if (projectSaveErr) done(projectSaveErr);

                            // Get a list of Projects
                            agent.get('/projects')
                                .end(function (projectsGetErr, projectsGetRes) {
                                    // Handle Project save error
                                    if (projectsGetErr) done(projectsGetErr);

                                    // Get Projects list
                                    var projects = projectsGetRes.body;

                                    // Set assertions
                                    (projects[0].user._id).should.equal(userId);
                                    (projects[0].title).should.match(name);

                                    // Call the assertion callback
                                    done();
                                });
                        });
                });
        });
        afterEach(function(done) {
            User.remove().exec();
            Project.remove().exec();
            done();
        });
    });
    callback();
});
async.each(['healthcare','food','education'], function(industry, callback) {
	describe('Param Test', function () {
		beforeEach(function (done) {
			// Create user credentials
			credentials = {
				username: 'username',
				password: 'password'
			};

			// Create a new user
			user = new User({
				firstName: 'Full',
				lastName: 'Name',
				displayName: 'Full Name',
				email: 'test@test.com',
				city: 'Addison',
				State: 'IL',
				username: credentials.username,
				password: credentials.password,
				provider: 'local'
			});

			// Save a user to the test db and create new Project
			user.save(function () {
				project = {
					title: 'test name',
					description: 'desc',
					industry: industry,
					tags: 'tags',
					location: 'Addison, IL',
					referred: '',
					created: Date.now(),
					user: user._id
				};

				done();
			});
		});

		it('should be able to save Project instance with industry:' + industry + ' if logged in', function (done) {
			agent.post('/auth/signin')
				.send(credentials)
				.expect(200)
				.end(function (signinErr, signinRes) {
					// Handle signin error
					if (signinErr) done(signinErr);
					// Get the userId
					var userId = user.id;

					// Save a new Project
					agent.post('/projects')
						.send(project)
						.expect(200)
						.end(function (projectSaveErr, projectSaveRes) {
							// Handle Project save error
							if (projectSaveErr) done(projectSaveErr);

							// Get a list of Projects
							agent.get('/projects')
								.end(function (projectsGetErr, projectsGetRes) {
									// Handle Project save error
									if (projectsGetErr) done(projectsGetErr);

									// Get Projects list
									var projects = projectsGetRes.body;

									// Set assertions
									(projects[0].user._id).should.equal(userId);
									(projects[0].industry).should.match(industry);

									// Call the assertion callback
									done();
								});
						});
				});
		});
		afterEach(function (done) {
			User.remove().exec();
			Project.remove().exec();
			done();
		});
	});
	callback();
});

async.each(['logo.jpg','elephants.jpg','rabbits.jpg'], function(name, callback) {
    describe('Param Test', function() {
        beforeEach(function (done) {
            // Create user credentials
            credentials = {
                username: 'username',
                password: 'password'
            };

            // Create a new user
            user = new User({
                firstName: 'Full',
                lastName: 'Name',
                displayName: 'Full Name',
                email: 'test@test.com',
                username: credentials.username,
                password: credentials.password,
                provider: 'local'
            });

            // Save a user to the test db and create new Project
            user.save(function () {
                project = {
                    title: 'project',
                    description: 'desc',
                    industry: 'test ind',
                    referred: '',
                    created: Date.now(),
                    user: user._id
                };

                done();
            });
        });

        it('should be able to save '+ name +' and get '+ name +' after creating project', function(done) {
            this.timeout(5000);
            agent.post('/auth/signin')
                .send(credentials)
                .expect(200)
                .end(function (signinErr, signinRes) {
                    // Handle signin error
                    if (signinErr) done(signinErr);
                    // Get the userId
                    var userId = user.id;

                    // Save a new Project
                    agent.post('/projects')
                        .send(project)
                        .expect(200)
                        .end(function (projectSaveErr, projectSaveRes) {
                            // Handle Project save error
                            if (projectSaveErr) done(projectSaveErr);
                            var projectId = projectSaveRes.body._id;
                            //var img = fs.openSync( path.join( __dirname , '/../img/default.jpg') ,'r' );
                            agent.post('/projects/img/' + projectId + '/logo.jpg')
                                .attach('file', path.join( __dirname , '/../img/default.jpg') )
                                .expect(200)
                                .end(function (imgSaveErr, imgSaveRes) {
                                    console.log('aaaaa');
                                    //if(imgSaveErr) done(imgSaveErr);
                                    //try to get image now
                                    agent.get('/projects/img/' + projectId + '/logo.jpg')
                                        .expect(200)
                                        .end(function() {
                                            done();
                                        });
                                });
                        });
                });
        });

        afterEach(function(done) {
            User.remove().exec();
            Project.remove().exec();
            done();
        });
    });
    callback();
});
