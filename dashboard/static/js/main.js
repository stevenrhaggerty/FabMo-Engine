/*
 * main.js is the entry point for the application.
 */

define(function(require) {

	// context is the application context
	// dashboard is the application context, but only the parts we want the apps to see
	var context = require('context');
	var dashboard = require('dashboard');

	// Allow to click more than 1 time on a link, to reload a page for example
	allowSameRoute();

	// Load the apps from the server
	context.apps = new context.models.Apps();
	context.apps.fetch({
		success: function() {
			// Create the menu based on the apps thus retrieved 
			context.appMenuView = new context.views.AppMenuView({collection : context.apps, el : '#app_menu_container'});

			//Sortable app icon (not used now, just for play !) //Disabled
			
			var menu_container = document.getElementById('app_menu_container');
			new Sortable(menu_container, {
				group: "apps",
				ghostClass: "sortable-ghost",
				disabled: true,
				animation: 150,
				delay: 500,
				store: {
				  // Get the order of elements. Called once during initialization. //
				  get: function (sortable) {		      
				  	  var order = localStorage.getItem(sortable.options.group);
				      return order ? order.split('|') : [];
				  },
				  // Save the order of elements. Called every time at the drag end //
				  set: function (sortable) {
				      var order = sortable.toArray();
				      localStorage.setItem(sortable.options.group, order.join('|'));
				  }
				}
			});

			// Create remote machine model based on the one remote machine that we know exists (the one we're connecting to)
			context.remoteMachines.reset([
				new context.models.RemoteMachine({
						hostname : window.location.hostname,
						ip : window.location.hostname,
						port : window.location.port
				})
			]);

			// Create a FabMo object for the dashboard
			dashboard.machine = new FabMo(window.location.hostname, window.location.port);
			dashboard.socket = require('websocket').SocketIO();

			// Create a FabMoUI object for the same (but don't recreate it if it already exists)
			if (!dashboard.ui) {
				dashboard.ui= new FabMoUI(dashboard.machine);
			}
			else {
				dashboard.ui.tool = dashboard.machine;
			}

			dashboard.ui.on('error', function(err) {
				$('#modalDialogTitle').text('Error!');
				$('#modalDialogLead').html('<div style="color:red">There was an error!</div>');
				$('#modalDialogMessage').text(err);
				$('#modalDialogDetail').html(
					'<p>' + 
					  '<b>Job Name:  </b>' + dashboard.machine.status_report.job.name + '<br />' + 
					  '<b>Job Description:  </b>' + dashboard.machine.status_report.job.description + 
					'</p>'
					);

				$('#modalDialog').foundation('reveal', 'open');
			});

			dashboard.ui.updateStatus();

			// Configure keyboard input
			setupHandwheel();

			// Start the application
			router = new context.Router();
			router.setContext(context);

			Backbone.history.start();
		}
	});




	//$(function () { $('.app-studio-files').jstree(); });

function setupHandwheel() {
	wheel = new HandWheel("wheel", {
		ppr:32, 
		thumbColor: "#9C210C", 
		wheelColor:"#DD8728", 
		lineColor:"#000000",
		textFont: "source_sans_proextralight",
		textSize: 10,
		thumbs: ['X','Y','Z'],
		modes: ['S','M','F','D']
	});

	var SCALE = 0.005;
	var SPEEDS = {'S': 20, 'M':40, 'F':80}
	var angle = 0.0;
	var speed = 30.0;
	var mode = 'S';
	var TICKS_MOVE = 10;
	var TICKS_DISCRETE = 90;
	var discrete_distance = 0.005;

	wheel.on("sweep", function(evt) {

		var degrees = evt.angle*180.0/Math.PI;
		angle += degrees;
		var distance = Math.abs(angle*SCALE);
		var axis = evt.thumb;

		if(mode === 'D') {
			if(angle > 90) {
				angle = 0;
				dashboard.machine.fixed_move('+' + axis, discrete_distance, SPEEDS['S'], function(err) {});
			}
			if(angle < -90) {
				angle = 0;
				dashboard.machine.fixed_move('-' + axis, discrete_distance, SPEEDS['S'], function(err) {});
			}
		} else {
			if(angle > TICKS_MOVE) {
				angle = 0;
				dashboard.machine.fixed_move('+' + axis, distance, speed, function(err) {});
			}
			if(angle < -TICKS_MOVE) {
				angle = 0;
				dashboard.machine.fixed_move('-' + axis, distance, speed, function(err) {});
			}
		}
	});

	wheel.on("release", function(evt) {
		dashboard.machine.quit(function() {})
	});

	wheel.on("mode", function(evt) {
		mode = evt.mode;
		if(evt.mode === 'D') {
			wheel.setPPR(4);
		} else {
			wheel.setPPR(32);
			speed = SPEEDS[evt.mode];
		}
	});

}
// Functions for dispatching g-code to the tool
function gcode(string) {
	dashboard.machine.gcode(string,function(err,data){
		// Maybe report an error here.
	});
}

// Functions for dispatching g-code to the tool
function sbp(string) {
	dashboard.machine.sbp(string,function(err,data){
		// Maybe report an error here
	});
}

function addJob(job,callback){
	dashboard.machine.send_job(job,function(err){
		if(err){console.error(err);callback(err);return;}
		if(callback && typeof(callback) === "function")callback(undefined);
	});
}

function allowSameRoute(){
	//Fix the bug that doesn't allow the user to click more than 1 time on a link
	//Intercept the event "click" of a backbone link, then temporary set the route to "/"
	$('a[href^="#"]').click(function(e) { router.navigate('/'); });
}

$(document).on('close.fndtn.reveal', '[data-reveal]', function (evt) {
  var modal = $(this);
  dashboard.machine.quit(function() {});
});

// Handlers for the home/probe buttons
$('.button-zerox').click(function(e) {sbp('ZX'); });  
$('.button-zeroy').click(function(e) {sbp('ZY'); });  
$('.button-zeroz').click(function(e) {sbp('ZZ'); });

});
