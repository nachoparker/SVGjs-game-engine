//	TODO
//	====
//	* Moments of inertia
//	* Outer Bounding box to ease checks
//	* selecting box
//	- review chase(all chase the same, chase in a line)&rect movements, new movements: land, (also when pressing diagonal arrow movements)
//	* for some reason, 'keyup' fires upon holding a key pressed, this prevents me from disabling events. General performance review
//	* panel and right click menus
//	* include external SVGs - 'use or image' (no Mozilla support yet!!), coordinating from an upperlevel XHTML document or using AJAX
//	* XML configuration file
//	* resize event


addEventListener( 'load', init, false );

function init()
{
  ///INITIALIZE FULL SCREEN
  document.documentElement.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );
  document.documentElement.setAttribute( 'width' , window.innerWidth );
  document.documentElement.setAttribute( 'height', window.innerHeight );

  ///ORGANIZE ELEMENTS IN LISTS

  allList = getList();
  elementList = allList.find( element );
  objectList = elementList.find( element, 'object' );
  characterList = elementList.find( element , 'character' );
  animatedElementList = characterList;
  selectedList = [];
  collisionList = elementList.slice();//[];
  scene = allList.find( map, 'main')[0];
//   subject = characterList.search( 'subject' );

  ///error check
  if ( !scene ) return;

  ///SET EVENTS
  document.addEventListener( 'keydown', 	keyboard, 	false );
  document.addEventListener( 'keyup', 		keystop, 	false );
//   document.addEventListener( 'mousemove', 	mouseMove, 	false );//poor performance but works ok, TODO bind to mouse key to activate
  document.addEventListener( 'mousedown', 	mouseClick, 	false );
  document.addEventListener( 'contextmenu', 	function(e){e.stopPropagation();e.preventDefault(); return false}/*mouse*/, 		false );
  document.addEventListener( 'DOMMouseScroll',	wheel,		false );

  setInterval( 'drawFrame()', 50 );
}

  //GENERAL CONFIGURATION

  photogramsPerCycle = 10;
  panSteps = 50;
  shiftAngle = 5*Math.PI/180;
  frictionMoment = 0.005;
  baseSpeed = 1;
  baseAccel = 0.2;

function getSVGNodeList( attribute, value )		///get SVG nodes with that 'attribute' that match 'value', or all if no 'value'. All SVGs if no 'attribute'.
{
    var SVGlist = document.getElementsByTagName( 'svg' );
    var nodeList = [];

    if ( attribute )
      for ( var i = 0 ; i < SVGlist.length ; i++ )
      {
	var auxAttr = SVGlist[i].getAttribute( attribute )  ;
	if ( auxAttr && ( !value || auxAttr == value ) )
	  nodeList.push( SVGlist[i] );
      }
    else
      nodeList = SVGlist;

    return nodeList;
}

function getList( attribute, value )  ///Returns list of objects, each one of its correct object type. List contains 'attribute=value', 'attribute'=(any)', or all SVGs.
{
  var list = [];
  var nodeList = getSVGNodeList( attribute, value ); 	//gets all SVGs if no attribute, all of kind 'attribute' if no 'value'

  for ( var i = 0 ; i < nodeList.length ; i++ )
    if ( nodeList[i].getAttribute( 'element' ) )
    {
      if ( nodeList[i].getAttribute( 'element' ) == 'object' )
	list.push( new element( nodeList[i].getAttribute( 'id' ) ) );

      else if ( nodeList[i].getAttribute( 'element' ) == 'character' )
	list.push( new character( nodeList[i].getAttribute( 'id' ) ) );
    }
    else if ( nodeList[i].getAttribute( 'map' ) )
      list.push( new map( nodeList[i].getAttribute( 'id' ) ) );

  return list;
}

Array.prototype.find = function ( class, type )
{
    var returnList = [];

    var j=0;
    for ( var i = 0 ; i < this.length ; i++ )
      if ( ( !class || this[i].constructor == class  ) && ( !type || this[i].type == type ) )
	returnList.push( this[i] );
    return returnList;
}

//////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

function drawFrame()
{
  doCollisions();
  doMovements();
  doAnimations();
  scene.pan();
  scene.zoom();
}

function doAnimations( objList )		// Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
    var objList = objList || animatedElementList;
    for ( var i = 0 ; i < objList.length ; i++ )
      objList[i].animate();
}

function doMovements( objList )		// Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
    var objList = objList || elementList;
    for ( var i = 0 ; i < objList.length ; i++ )
      objList[i].move();
}

function doCollisions()
{
  for ( var i = 0 ; i < collisionList.length ; i++ )
    for ( var j = i+1 ; j < collisionList.length ; j++ )
    {
      var collision = collisionList[i].hitsWith( collisionList[j] );
      if( collision )
	collisionList[i].elasticImpact( collisionList[j], collision[0], collision[1] );
    }
}

function vector( x, y )
{
    if ( x instanceof vector )
    {
      this.x = x.x;
      this.y = x.y;
    }
    else
    {
      if (x)
	this.x = parseFloat( x );
      else
	this.x = 0.0;
      if(y)
	this.y = parseFloat( y );
      else
	this.y = 0.0;
    }
}

vector.prototype.add = function ( deltaX, deltaY )
{
    var returnPoint = new vector( this.x, this.y );

    if ( deltaX instanceof vector )
    {
	returnPoint.x += deltaX.x;
	returnPoint.y += deltaX.y;
    }
    else
    {
	returnPoint.x += deltaX;
	returnPoint.y += deltaY;
    }

    return returnPoint;
}

vector.prototype.minus = function ( deltaX, deltaY )
{
    var returnPoint = new vector( this.x, this.y );

    if ( deltaX instanceof vector )
    {
	returnPoint.x -= deltaX.x;
	returnPoint.y -= deltaX.y;
    }
    else
    {
	returnPoint.x -= deltaX;
	returnPoint.y -= deltaY;
    }

    return returnPoint;
}

vector.prototype.multiply = function ( scalar )
{
    var returnPoint = new vector( this.x, this.y );
    if ( scalar == undefined )
      scalar = 1;
    returnPoint.x *= scalar;
    returnPoint.y *= scalar;
    return returnPoint;
}

vector.prototype.modulus = function ()
{
    return Math.sqrt( this.x*this.x + this.y*this.y );
}

vector.prototype.direction = function ()
{
    return this.multiply( 1/this.modulus() );
}

vector.prototype.angle = function( vec )		//returns the angle with X axis, or with vector, defined between [-PI, +PI)
{
    if ( vec instanceof vector )
      var value = angleCheck( vec.angle() - this.angle() );
    else
    {
      if ( this.x < 0 )
	var shift = Math.PI;
      else
	var shift = 0;
      var value = ( shift + Math.atan( this.y/this.x ) );		//values between [-PI/2, 3*PI/2)

      if ( value >= Math.PI )					//correct the range [PI, 3*PI/2)
	value -= 2*Math.PI;
    }
    return value;
}

function angleCheck( ang )					//makes sure an angle is expressed between [-PI, +PI)
{
  ang = ang % (2*Math.PI);					//values between [-2*PI/2, +2*PI)
  if ( ang < -Math.PI )					//correct the range [-PI, -2*PI)
    ang += 2*Math.PI;
  if ( ang > Math.PI )						//correct the range [+PI, +2*PI)
    ang -= 2*Math.PI;
  return ang;
}

vector.prototype.project = function( vecX, vecY )
{
    if ( vecX instanceof vector )
      return this.x*vecX.x + this.y*vecX.y;
    else
      return this.x*vecX + this.y*vecY;
}

vector.prototype.rotate = function ( angle )
{
    angle = angle || shiftAngle;
    var newAngle= this.angle() + angle;
    var newModulus = this.modulus();
    this.x = newModulus*Math.cos( newAngle );
    this.y = newModulus*Math.sin( newAngle );
//     var sinA = Math.sin( angle );
//     var cosA = Math.cos( angle );
//     var x = this.y*sinA + this.x*cosA;//TODO
//     var y = this.y*cosA - this.x*sinA;
//     this.x = x;
//     this.y = y;
}

vector.prototype.equals = function ( a, b )
{
    if ( a instanceof vector )
    {
      if ( this.x == a.x && this.y == a.y )
	return true;
      else
	return false;
    }
    else
    {
      if ( this.x == a && this.y == b )
	return true;
      else
	return false;
    }
}

function axes( dirX, dirY, center )	//define new axes ( or XY axis without parameters ). Only needs the direction of one axis
{
  if ( center instanceof vector )
    this.center = center;
  else
    this.center = new vector( 0, 0 );

  if ( dirX instanceof vector )
    this.dirX = dirX.direction();
  else
    this.dirX = new vector( 1, 0 );

  if ( dirY instanceof vector )
    this.dirY = dirY.direction();
  else
     this.dirY = new vector( -this.dirX.y, this.dirX.x );
}

axes.prototype.project = function( vec )	//rotate vectors to work in the new axes
{
  if ( vec instanceof vector )
    return new vector( vec.project( this.dirX ) , vec.project( this.dirY ) );
}

axes.prototype.unproject = function( vec ) 	//rotate the result back to the original XY axes, supposing perpendicular axes
{
  if ( vec instanceof vector )
    return new vector( vec.project( this.dirX.x, -this.dirX.y ) , vec.project( this.dirX.y, this.dirX.x ) );
}

axes.prototype.rotate = function( ang )
{
  this.dirX.rotate( ang );
  this.dirY.rotate( ang );
}

function rectangle( width, height, center, rotation )
{
  this.width = width;
  this.height = height;
  this.pos = center || new vector( 0, 0 );
  this.rotation = rotation || 0;
  this.points = this.samplePoints();
  }

rectangle.prototype.samplePoints =  function( )		// creates a list of points inside the surface, in the coordinates of the center of the rectangle
{
  var points = [];
  points.push( new vector( this.width/2 , this.height/2 ) );		//inferior right corner
  points.push( new vector( -this.width/2 , this.height/2 ) );		//inferior left corner
  points.push( new vector( this.width/2 , -this.height/2 ) );		//superior right corner
  points.push( new vector( -this.width/2 , -this.height/2 ) );	//superior left corner

  return points;
}

rectangle.prototype.isInside = function ( item )
{
  var result = undefined;
  if ( item instanceof vector )
  {
    var increment = item.minus( this.pos );
    if ( this.rotation != 0 )
    {
      var rectAxes = new axes();
      rectAxes.rotate( this.rotation );
      increment = rectAxes.project( increment );
    }
    var directions = [ false, false, false, false ];

    if ( increment.x >= 0 && increment.x <= this.width/2 ) 	//right
      directions[0] = true;
    if ( increment.x < 0 && -increment.x <= this.width/2 ) 	//left
      directions[1] = true;
    if ( increment.y >= 0 && increment.y <= this.height/2 ) 	//beneath
      directions[2]= true;
    if ( increment.y < 0 && -increment.y <= this.height/2 )	//above
      directions[3] = true;

    if ( ( directions[2] || directions[3] ) && (  directions[0] || directions[1] ) )
      result = item;
  }
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.isInside( pt ) )
	result = pt;
    }

  return result; 		// return 'undefined' or the point of collision
}

function circle( radius, center )
{
  this.pos = center || new vector( 0, 0 );
  this.radius = radius || 10;
  this.points = this.samplePoints();
}

circle.prototype.samplePoints =  function( number )
{
  number = number || 8;
  var points = [];
  for ( var i = 0 ; i < number ; i++ )
    points.push( new vector( this.radius*Math.cos(2*i*Math.PI/number) , this.radius*Math.sin(2*i*Math.PI/number) ) );
  return points;
}

circle.prototype.isInside = function ( item )
{
  var result = undefined;
  if ( item instanceof vector )
  {
    var increment = this.pos.minus( item );
    if ( increment.modulus() <= this.radius )
      result = item;
  }
  else if ( item instanceof circle )
  {
    var increment = this.pos.minus( item.pos );
    if ( increment.modulus() <= item.radius + this.radius )
      result = item.pos;					//in circle vs circle, just return the position of the center to calculate the normal
  }
  else if ( item instanceof rectangle || item instanceof ellipse )
  for ( var i = 0 ; i < item.points.length ; i++ )
  {
    var pt = new vector( item.points[i] );
    pt.rotate( item.rotation );
    pt = pt.add( item.pos );
    if ( this.isInside( pt ) )
      result = pt;
  }

  return result;	//  return 'undefined' or the point of collision
}

function ellipse( radiusA, radiusB, center, rotation )	//radius A is the Y axis
{
  this.pos = center || new vector( 0, 0 );
  this.radiusA = radiusA || 20;
  this.radiusB = radiusB || 10;
  this.rotation = rotation || 0;
  this.points = this.samplePoints();
}

ellipse.prototype.samplePoints =  function( number )
{
  number = number || 24;
  var points = [];
  for ( var i = 0 ; i < number ; i++ )
    points.push( new vector( this.radiusB*Math.cos(2*i*Math.PI/number) , this.radiusA*Math.sin(2*i*Math.PI/number) ) );
  return points;
}

ellipse.prototype.isInside = function ( item )	// the ellipse is supposed to be vertical (long axis vertical)
{
  var result = undefined;

  if ( item instanceof vector )
  {
    var increment = this.pos.minus( item );
    if ( this.rotation != 0 )
    {
      var ellipseAxes = new axes();
      ellipseAxes.rotate( this.rotation );
      increment = ellipseAxes.project( increment );
    }
    if ( increment.x*increment.x/(this.radiusB*this.radiusB) + increment.y*increment.y/(this.radiusA*this.radiusA) <= 1 )
      result = item;
  }
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle )
  for ( var i = 0 ; i < item.points.length ; i++ )
  {
    var pt = new vector( item.points[i] );
    pt.rotate( item.rotation );
    pt = pt.add( item.pos );
    if ( this.isInside( pt ) )
      result = pt;
  }

  return result;		//  return 'undefined' or the point of collision
}

/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function rotation( angSpeed, friction )
{
  this.angSpeed = angSpeed || shiftAngle;
  this.friction = friction || 0;
}

rotation.prototype.advance = function()
{
  if ( this.friction != 0 )
    this.accelerate( -this.friction )
  return this.angSpeed;
}

rotation.prototype.isFinished = function()
{
    if ( this.angSpeed == 0 )
      return true;
    else
      return false;
}

rotation.prototype.accelerate = function ( angAcc )
{
    angAcc = angAcc || 0.005;

  if ( this.angSpeed >= 0 )
  {
    this.angSpeed += angAcc;
    if ( this.angSpeed < 0 )
      this.angSpeed = 0;
  }
  else
  {
    this.angSpeed -= angAcc;
    if ( this.angSpeed > 0 )
      this.angSpeed = 0;
  }
}


function movement ( initialDir, speed, friction )
{
    this.speed 		= speed || baseSpeed;
    this.direction 	= initialDir || new vector( 0, -1 );
    this.friction 	= friction || 0;
    this.accelState 	= 'none';
    this.components	= [];		//list with extra components to the movement, to add vectorially

    this.RAngle	= undefined;
    this.RCurv	= undefined;
    this.RSpeed	= undefined;
}

movement.prototype.velocity = function ()
{
  return this.direction.multiply( this.speed );
}

movement.prototype.advance = function () ///Returns the increment for each frame
{
  //Modifiers
  if ( this.accelState == 'accelerating' )
    this.accelerate();
  else if ( this.accelState == 'deccelerating' )
    this.deccelerate();
  if ( this.friction > 0 && this.accelState == 'none' )
    this.deccelerate( this.friction )

  //Random components
  if ( this.RSpeed || this.RCurv || this.RAngle )
    this.randomize();
  if ( this.RCurv )
    this.direction.rotate( this.curvature*this.speed );

  //Movement itself
  var result = this.direction.multiply( this.speed );

  //Add other components
  if ( this.components )
    for ( var i = 0 ; i < this.components.length ; i++ )
      result = result.add( this.components[i].advance() );

  return result;
}

movement.prototype.isFinished = function ()
{
    if ( this.speed == 0 )
      return true;
    else
      return false;
}

movement.prototype.accelerate = function ( acceleration )
{
    acceleration = acceleration || baseAccel;
    this.speed = this.speed + acceleration;
}

movement.prototype.deccelerate = function ( decceleration )
{
    decceleration = decceleration || baseAccel*2;
    var newSpeed = this.speed - decceleration;
    if ( newSpeed <= 0 )
      this.speed = 0;						//this will end and eliminate the movement from the list when move() is invoked
    else
    {
      var distance = this.speed*( this.steps - this.currentSteps );
      this.steps = this.currentSteps + distance/newSpeed;
      this.speed = newSpeed;
    }
}

function arrowMovement ( dir, speed, friction )
{
    this.up 	= false;
    this.down  	= false;
    this.right	= false;
    this.left	= false;

    movement.call( this, undefined, speed, friction );
    this.addDir( dir );
}
arrowMovement.prototype = new movement();
arrowMovement.prototype.constructor = arrowMovement;

arrowMovement.prototype.addDir = function( dir, add )		//add/substract a component to the movement and return resulting direction
{
    var direction = new vector( 0, 0 );
    if ( add == undefined )
      add = true;
    if ( dir )
    {
      if ( dir == 'up' )
	if ( add )
	  this.up  = true;
	else
	  this.up  = false;
      else if ( dir == 'down' )
	if ( add )
	  this.down  = true;
	else
	  this.down  = false;
      else if ( dir == 'right' )
	if ( add )
	  this.right = true;
	else
	  this.right = false;
      else if ( dir == 'left' )
	if ( add )
	  this.left = true;
	else
	  this.left = false;
	////////////////////
      if ( this.up )
	direction = direction.add( 0, -1 );
      if ( this.down )
	direction = direction.add( 0, 1 );
      if ( this.right )
	direction = direction.add( 1, 0 );
      if ( this.left )
	direction = direction.add( -1, 0 );
    }
    this.direction = direction.direction();
}

arrowMovement.prototype.isFinished = function ()
{
    return ( !this.up && !this.down && !this.right && !this.left );
}

function rectMovement( origPos, destPos, speed )
{
  movement.call( this, undefined, speed );

  var auxVector = new vector();

  this.origPosition = origPos || auxVector;
  this.destPosition = destPos || auxVector;

  var increment 	= this.destPosition.minus( this.origPosition );
  this.direction 	= increment.direction();
  this.distance 	= increment.modulus();
  this.steps 		= this.distance/this.speed;
  this.currentSteps 	= 0;
}
rectMovement.prototype = new movement();
rectMovement.prototype.constructor = rectMovement;

rectMovement.prototype.advance = function()
{
    this.currentSteps++;
    return movement.prototype.advance.call( this );
}

rectMovement.prototype.isFinished = function ()
{
    if ( this.currentSteps >= this.steps || this.speed == 0 )
      return true;
    else
      return false;
}

rectMovement.prototype.accelerate = function ( acceleration )
{
    acceleration = acceleration || baseAccel;
    var newSpeed = this.speed + acceleration;
    var distance = this.speed*( this.steps - this.currentSteps );
    this.steps = this.currentSteps + distance/newSpeed;
    this.speed = newSpeed;
}

rectMovement.prototype.setSpeed = function ( newSpeed ) //change speed before the movement begins (while in queue)
{
    if ( newSpeed && this.currentSteps == 0 )
    {
      this.speed = newSpeed;
      this.steps = this.distance/this.speed;
    }
}

function circleMovement( initialDir, curvature, speed )
{
  movement.call( this, initialDir, speed );
  this.curvature = curvature || 5*Math.PI/180;
}
circleMovement.prototype = new movement();
circleMovement.prototype.constructor = circleMovement;

circleMovement.prototype.advance = function()
{
    this.direction.rotate( this.curvature*this.speed );
    return movement.prototype.advance.call( this );
}

function curvedMovement( origPos, destPos, /*curvature,*/ speed )
{
  rectMovement.call( this, origPos, destPos, undefined, speed );//use rectMovement as a prototype for parametric movement
  this.direction.rotate( -Math.PI/2 );
  this.radius 		= this.distance/2; //Max curvature. input radius for more complexity?
  this.arch		= this.radius*Math.PI;
  this.steps 		= this.arch/this.speed;
  this.curvature	= Math.PI/this.steps;
}
curvedMovement.prototype = new rectMovement();
curvedMovement.prototype.constructor = curvedMovement;

curvedMovement.prototype.advance = function()
{
    this.currentSteps++;
    this.direction.rotate( this.curvature*this.speed );
    return movement.prototype.advance.call( this );
}

function carMovement( initialDir, speed )
{
  var friction = baseAccel/2;
  movement.call( this, initialDir, speed, friction );
  this.stirState = 'none';
}
carMovement.prototype = new movement();
carMovement.prototype.constructor = carMovement;

carMovement.prototype.advance = function ()
{
  if ( this.stirState == 'rotateRight' )
    this.direction.rotate( shiftAngle );
  else if ( this.stirState == 'rotateLeft' )
    this.direction.rotate( -shiftAngle );

  return movement.prototype.advance.call( this );
}

function chaseMovement( origPos, target, speed )
{
  rectMovement.call( this, target.pos, speed );

  this.position = origPos;
  this.target	= target;
}
chaseMovement.prototype = new rectMovement();
chaseMovement.prototype.constructor = chaseMovement;

chaseMovement.prototype.advance = function()
{
  this.destPosition	= this.target.pos;
  var increment 	= this.destPosition.minus( this.position );
  this.direction 	= increment.direction();
  this.distance 	= increment.modulus();

  var result		= rectMovement.prototype.advance.call( this );
  this.position		= this.position.add( result );

  this.steps 		= this.distance/this.speed;
  this.currentSteps 	= 0;

  return result;
}

chaseMovement.prototype.isFinished = function ()
{
    var result = false;
    if ( this.target && this.target instanceof element )
    {
//       	if ( this.height >= this.width )
// 	  var radiusA = this.height/2;
// 	else
// 	  var radiusA = this.width/2;

	if ( this.target.height <= this.target.width )
	  var radius = this.target.height/2;
	else
	  var radius = this.target.width/2;

	var radiusA = radius; //improve

	var increment = this.position.minus( this.target.pos );
	if ( increment.modulus() <= radius + radiusA )
	  result = true;
    }
    return result;


//     var result = false;
//     var increment = this.position.minus( this.target.pos );
//     if ( increment.modulus() <= 10 )			///threshold
//       result = true;
//     return result;
}

movement.prototype.randomSpeed = function( avgSpeed,stdSpeed, avgPeriod, stdPeriod )
{
    this.RSpeed = {};
    this.RSpeed.avg  = avgSpeed || baseSpeed/2;
    this.RSpeed.std  = stdSpeed || baseSpeed/2;

    this.RSpeed.avgPeriod = avgPeriod || 5/this.avgSpeed;
    this.RSpeed.stdPeriod = stdPeriod || 2.5/this.avgSpeed;
    this.RSpeed.period  = this.RSpeed.avgPeriod;
    this.RSpeed.count   = 0;
}

movement.prototype.randomCurv = function( avgCurv,stdCurv, avgPeriod, stdPeriod )
{
    this.RCurv = {};
    this.curvature = 0;
    this.RCurv.avg  = avgCurv || 0;
    this.RCurv.std  = stdCurv || 15*Math.PI/180;

    this.RCurv.avgPeriod = avgPeriod || 10;
    this.RCurv.stdPeriod = stdPeriod || 5;
    this.RCurv.period  = this.RCurv.avgPeriod;
    this.RCurv.count   = 0;
}

movement.prototype.randomAngle = function( avgAngle, stdAngle, avgPeriod, stdPeriod )
{
    this.RAngle = {};
    this.RAngle.avg  = avgAngle || 0;
    this.RAngle.std  = stdAngle || 2*Math.PI;

    this.RAngle.avgPeriod = avgPeriod || 10;
    this.RAngle.stdPeriod = stdPeriod || 5;
    this.RAngle.period  = this.RAngle.avgPeriod;
    this.RAngle.count   = 0;
}

movement.prototype.randomize = function()
{
  if ( this.RSpeed )
  {
    this.RSpeed.count++;
    if ( this.RSpeed.count >= this.RSpeed.period )
    {
      this.speed = this.RSpeed.avg + this.RSpeed.std*( Math.random() - 0.5 );
      this.RSpeed.period = this.RSpeed.avgPeriod + this.RSpeed.stdPeriod*( Math.random() - 0.5 );
      this.RSpeed.count = 0;
      this.RSpeed.avgPeriod = 5/this.speed;
      this.RSpeed.stdPeriod = 2.5/this.speed;
    }
  }
  if ( this.RCurv )
  {
    this.RCurv.count++;
    if ( this.RCurv.count >= this.RCurv.period )
    {
      this.curvature = this.RCurv.avg + this.RCurv.std*( Math.random() - 0.5 );
      this.RCurv.period = this.RCurv.avgPeriod + this.RCurv.stdPeriod*( Math.random() - 0.5 );
      this.RCurv.count = 0;
      this.RCurv.avgPeriod = 5/this.speed;
      this.RCurv.stdPeriod = 2.5/this.speed;
    }
  }
  if ( this.RAngle )
  {
    this.RAngle.count++;
    if ( this.RAngle.count >= this.RAngle.period )
    {
      var angle = this.Rangle.avg + this.RAngle.std*( Math.random() - 0.5 );
      this.direction = new vector( Math.cos( angle ), Math.sin( angle ) );
      this.RAngle.period = this.RAngle.avgPeriod + this.RAngle.stdPeriod*( Math.random() - 0.5 );
      this.RAngle.count = 0;
      this.RAngle.avgPeriod = 5/this.speed;
      this.RAngle.stdPeriod = 2.5/this.speed;
    }
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

function element( id, coordinates )
{
  if ( !id ) return;
  ///GENERAL
  this.SVGNode = document.getElementById( id );
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'element' );
  this.SVGNode.setAttribute( 'overflow' , 'visible' );

  ///WRAP EVERYTHING IN A GROUP
  this.group = document.createElementNS( 'http://www.w3.org/2000/svg', 'g' );
  this.group.setAttribute( 'id' , id + 'group' );

  while ( this.SVGNode.childNodes.length > 0 )
    this.group.appendChild( this.SVGNode.firstChild );

  this.SVGNode.appendChild( this.group );

  ///STATUS
  this.selected		= false;
  this.state	 	= 'none';
  this.animation 	= 'none';

  this.orientation	= new vector( 0, -1 );
  this.rotation		= undefined;
  this.angle		= 0;
  this.movementList	= [];

  ///DIMENSIONS AND LOCATION
  this.height 	= parseFloat( this.SVGNode.getAttribute( 'height' ) ) || 10.0;
  this.width  	= parseFloat( this.SVGNode.getAttribute( 'width'  ) ) || this.height*window.innerWidth/window.innerHeight;

  if ( coordinates )
  {
    this.pos = coordinates;
    this.SVGNode.setAttribute( 'x', this.pos.x - this.width/2  );
    this.SVGNode.setAttribute( 'y', this.pos.y - this.height/2 );
  }
  else
  {
    var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || 0;
    var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || 0;

    this.pos = new vector( readX + this.width/2, readY + this.height/2 );
  }

  ///ATTRIBUTES
  this.mass = parseFloat( this.SVGNode.getAttribute( 'mass' ) ) || Infinity;

  var readShape = this.SVGNode.getAttribute( 'shape' ) || 'rectangle';
  if ( readShape == 'circle' )
  {
    this.shape = this.circle();
    this.momInertia = this.mass*( this.shape.radius*this.shape.radius )/2;
  }
  else if ( readShape == 'ellipse' )
  {
    this.shape = this.ellipse();
    this.momInertia = this.mass*( this.shape.radiusA*this.shape.radiusA + this.shape.radiusB*this.shape.radiusB )/4;
  }
  else
  {
    this.shape = this.rectangle();
    this.momInertia = this.mass*( this.width*this.width + this.height*this.height )/12;
  }

  ///CONFIG
  this.keyHandler = undefined;
  this.keyStopHandler = undefined;
  var that = this;
  this.SVGNode.addEventListener( 'mousedown', function ( event ){ that.mouse( event ) }, false );
}

element.prototype.setPosition = function ( newPos )
{
  if (newPos instanceof vector )
  {
    this.pos = newPos;
    this.SVGNode.setAttribute( 'x', newPos.x - this.width/2  );
    this.SVGNode.setAttribute( 'y', newPos.y - this.height/2 );
  }
}

element.prototype.getPosition = function ()
{
  return new vector( this.pos );
}

element.prototype.getShapeAt = function ( newPos, angle )
{
  if ( newPos instanceof vector )
    this.shape.pos = this.pos;
  if ( angle )
    this.shape.rotation = this.angle;

  return this.shape;
}

element.prototype.rectangle = function()
{
  return new rectangle( this.width, this.height, this.pos, this.angle );
}

element.prototype.circle = function()
{
  return new circle( this.height>this.width?this.height/2:this.width/2, this.pos );
}

element.prototype.ellipse = function()
{
  var radiusA = this.height/2;
  var radiusB = this.width/2;
  return new ellipse( radiusA, radiusB , this.pos, this.angle );
}

element.prototype.setState = function ( newState, newAnimation )
{
  this.state = newState || 'stopped';
  switch ( this.state )
  {
    case 'moving' :
      this.animation = newAnimation || 'moving';
      break;
    default :
      this.animation = newAnimation || 'stopped';
      this.cancelMovements();
  }
  if ( newAnimation )
    this.animation = animation;
}

element.prototype.setSelected = function( selected )
{
      var that = this;
      if ( selected == undefined )
	  selected = true;

      if ( selected && !this.selected )		//here it goes, some closure madness xDDDDD
      {
	  this.keyHandler = function( event ) { that.key( event ); }
	  this.keyStopHandler = function ( event ){ that.keyStop( event ) }
	  document.addEventListener( 'keydown', this.keyHandler, false );
	  document.addEventListener( 'keyup', this.keyStopHandler, false );
	  this.selected = true;
	  selectedList.push( this );
      }
      if ( !selected && this.selected )
      {
	  document.removeEventListener( 'keydown', this.keyHandler, false );
	  document.removeEventListener( 'keyup', this.keyStopHandler, false );
	  this.keyHandler = undefined;
	  this.keyStopHandler = undefined;
	  for ( var i = 0 ; i < selectedList.length ; i++ )
	    if ( this == selectedList[i] )
	    {
	      selectedList.splice( i, 1 );
	      i = selectedList.length;
	    }
	  this.selected = false;
      }
      scene.unfollow();
      scene.setMaxZoom();
}

element.prototype.toggleSelected = function()
{
      if ( this.selected )
	this.setSelected( false );
      else
	this.setSelected( true );
}

function selectAll( option )
{
    if ( option == undefined )
      option = true;
    for ( var i = 0 ; i < elementList.length ; i++ )
	elementList[i].setSelected( option );
}

element.prototype.addMovement = function( newMovement )
{
    if ( newMovement && newMovement instanceof movement )
    {
      this.movementList.push( newMovement );
      this.setState( 'moving' );
    }
}

element.prototype.replaceMovement = function( newMovement )
{
    if ( newMovement && newMovement instanceof movement )
    {
      this.cancelMovements();
      this.addMovement( newMovement );
      this.setState( 'moving' );
    }
}

element.prototype.finishMovement = function()
{
    if ( this.movementList.length > 0 )
    {
      var lastSpeed = this.movementList[0].speed;
      var state = this.movementList[0].state;
      this.movementList.shift();
      if ( this.movementList[0] )
      {
	this.orientation = this.movementList[0].direction;
	this.movementList[0].setSpeed( lastSpeed );
	this.movementList[0].state = state;
      }
    }
}

element.prototype.cancelMovements = function()
{
    this.movementList = [];
}

element.prototype.moveTo = function ( destPos, append, curved )		///convenience function to make the element move towards a position, now or after
{
    if ( append == undefined )
      append = false;
    if ( curved == undefined )
      curved = false;

    if ( !append || this.movementList.length == 0 )
    {
      if( !curved )
	this.replaceMovement( new rectMovement  ( this.pos, destPos ) );
      else
	this.replaceMovement( new curvedMovement( this.pos, destPos ) );
    }
    else
    {
      if( !curved )
	this.addMovement( new rectMovement( this.movementList[this.movementList.length-1].destPosition, destPos ) );
      else
	this.addMovement( new curvedMovement( this.movementList[this.movementList.length-1].destPosition, destPos ) );
    }
}

element.prototype.move = function ( newMove )  			//position update for each frame
{
    //ELEMENT TRANSLATIONS
    if ( newMove instanceof movement )
      this.addMovement( newMove );				//add a new movement to the element, provided for convenience
    else if ( this.movementList[0] )
    {
      this.setPosition ( this.pos.add( this.movementList[0].advance() ) );
      if ( this.movementList[0].isFinished() )
	this.finishMovement();
    }
    //ELEMENT ROTATIONS
    if ( this.rotation )
    {
      var increment =  this.rotation.advance();
      this.orientation.rotate( increment );
      this.rotate( increment );
      if ( this.rotation.isFinished() )
	this.rotation = undefined;
    }
}

element.prototype.rotate = function( angle )
{
  if ( angle == undefined )
    angle = 5*Math.PI/180;
  this.angle += angle;
  this.angle = angleCheck( this.angle );
  this.group.setAttribute( 'transform', 'rotate( ' + this.angle*180/Math.PI + ',' + this.width/2 + ',' + this.height/2 + ')' );
}

element.prototype.chase = function ( targetObj, accelerating, speed )
{
    this.replaceMovement( new chaseMovement( this.pos, targetObj, speed ) );
}

element.prototype.hits = function( checkPoint, radius )		///check if the element hits a point
{
    var result = false;
    if ( checkPoint && checkPoint instanceof vector )
    {
	radius = radius || 10;
	var increment = this.pos.minus( checkPoint );
	if ( increment.modulus() <= radius )
	  result = true;
    }
    return result;
}

element.prototype.hitsWith = function( obj )		///Check if the element hits another element's bounding shape
{
    var result = undefined;

    if ( obj && obj instanceof element && this !== obj )
    {
      var thisShape = this.getShapeAt( this.pos, this.angle );
      var  objShape =  obj.getShapeAt(  obj.pos,  obj.angle );

      var colPt1 = thisShape.isInside(  objShape );
      var colPt2 =  objShape.isInside( thisShape );

      if ( colPt1 )
      {
	result = [ this.getNormal( colPt1 ) , colPt1 ];
      }
      if ( colPt2 )
      {
	result = [  obj.getNormal( colPt2 ) , colPt2 ];
      }
    }

    return result;//return 'undefined', or the point and normal vector of collision
}

element.prototype.elasticImpact = function( obj, dirN, point )	//solve impact according to surfaces, or with a wall with normal 'normalDir'
{
    // EXTRACT PARAMETERS
    if ( this.movementList[0] )
      var vel1 = this.movementList[0].velocity();
    else
      var vel1 = new vector( 0, 0 );

    if ( obj.movementList[0] )
      var vel2 = obj.movementList[0].velocity();
    else
      var vel2 = new vector( 0, 0 );

    //MOVE THE OBJECTS OUT OF EACH OTHER IF THERE IS OVERLAPPING
    if ( vel1.equals( 0, 0 ) && vel2.equals( 0, 0 ) )
    {
      var dirN = this.pos.minus( obj.pos ).direction();
      this.setPosition ( this.pos.add( dirN.multiply(  baseSpeed/5 ) ) );
      obj.setPosition  (  obj.pos.add( dirN.multiply( -baseSpeed/5 ) ) );

      this.rotation = undefined;
       obj.rotation = undefined;
    }
    else
    {
      var dirN = dirN || this.pos.minus( obj.pos );

      ///AXES CHANGE: extract the velocity in the axis parallel and normal to the collision
      var newAxes = new axes( dirN );
      var projVel1 = newAxes.project( vel1 );
      var projVel2 = newAxes.project( vel2 );

      /// COLLISION: exchange of momentum and velocity determination in the new axes
      var auxVel1 = new vector( ( projVel1.x*(this.mass-obj.mass) + 2*projVel2.x*obj.mass )/(this.mass+obj.mass) , projVel1.y );
      var auxVel2 = new vector( ( projVel2.x*(obj.mass-this.mass) + 2*projVel1.x*this.mass )/(obj.mass+this.mass) , projVel2.y )

      ///CHECK THAT THE FINAL VELOCITIES ARE ENOUGH TO PREVENT OVERLAPPING AND THUS LOCKING //TODO
//       if ( Math.abs( auxVel1.x - auxVel2.x ) < Math.abs( projVel1.x - projVel2.x ) )
//       {
// 	auxVel1.x = -projVel2.x;
// 	auxVel2.x = -projVel1.x;
//       }

      /// RESULT: conversion back to the XY axes, and determination of new movements
      var newVel1 = newAxes.unproject( auxVel1 );
      var newVel2 = newAxes.unproject( auxVel2 );

      this.replaceMovement ( new movement( newVel1.direction(), newVel1.modulus(), baseAccel/2 ) );
      obj.replaceMovement  ( new movement( newVel2.direction(), newVel2.modulus(), baseAccel/2 ) );

      //CHANGE IN MOMENT OF INERTIA
      var deltaV1 = -1*( auxVel1.x - projVel1.x );	//the normal points out of 'this', so the force points inwards
      var deltaV2 = auxVel2.x - projVel2.x;		//the force to the second object has the same direction as the normal to 'this'
      var d1 = point.minus( this.pos );
      var d2 = point.minus(  obj.pos );
      var ang1 = d1.angle( dirN.multiply(-1) );		//same thing here
      var ang2 = d2.angle( dirN );

      var deltaW1 = this.mass*d1.modulus()*Math.sin(ang1)*deltaV1/this.momInertia;
      var deltaW2 =  obj.mass*d2.modulus()*Math.sin(ang2)*deltaV2/obj.momInertia;

      if ( this.rotation )
	var W1 = this.rotation.angSpeed;
      else
	var W1 = 0;
      if ( obj.rotation )
	var W2 = obj.rotation.angSpeed;
      else
	var W2 = 0;

      this.rotation = new rotation( W1 + deltaW1 , frictionMoment );
       obj.rotation = new rotation( W2 + deltaW2 , frictionMoment );
    }
}

element.prototype.getNormal = function( point ) 			///GET THE NORMAL VECTOR IN THE DIRECTION OF THE COLLISION
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = point.minus( this.shape.pos ).angle();
      if ( this.shape instanceof rectangle )
	{
	  ang = angleCheck( ang - this.shape.rotation );	//between [-PI, +PI)
	  var alpha = Math.atan( this.shape.height/this.shape.width );				//between [0, PI/2)

	  if (  ang >= -alpha && ang <= alpha )
	    result = new vector( Math.cos( this.shape.rotation ), Math.sin( this.shape.rotation ) );//TODO use rotate(), more clear
	  else if (  ang > alpha && ang <= Math.PI - alpha )
	    result = new vector( -Math.sin( this.shape.rotation ), Math.cos( this.shape.rotation ) );
	  else if (  ang > Math.PI - alpha || ang <= -Math.PI + alpha )
	    result = new vector( -Math.cos( this.shape.rotation ), -Math.sin( this.shape.rotation ) );
	  else	//(ang<-alpha && ang>-PI+alpha)
	    result = new vector( Math.sin( this.shape.rotation ), -Math.cos( this.shape.rotation ) );
	}
	else if ( this.shape instanceof circle )
	  result = new vector( this.shape.radius*Math.cos( ang ) , this.shape.radius*Math.sin( ang ) );
	else if ( this.shape instanceof ellipse )
	{
	  ang = angleCheck( ang - this.shape.rotation );
	  result = new vector( this.shape.radiusA*Math.cos( ang ) , this.shape.radiusB*Math.sin( ang ) );
	  result.rotate( this.shape.rotation );
	}
    }
    return result;
}

element.prototype.mouse = function( event )
{
  if ( event.ctrlKey )
    {
      if ( !( selectedList.length == 1 && selectedList[0] == this ) )
	this.toggleSelected();
    }
    else
    {
      selectAll( false );
      this.setSelected();
    }
    event.stopPropagation();
}

element.prototype.key = function( event )
{
//     document.removeEventListener( 'keydown', this.keyHandler,  false );
//     this.keyHandler = undefined;
    if ( event.keyCode == 27 ) ///'esc' CANCEL MOVEMENTS
      this.cancelMovements();

    if ( event.keyCode == 84 ) ///'t' FORWARDS
	this.replaceMovement( new movement( this.orientation ) );
    if ( event.keyCode == 71 ) ///'g' BACKWARDS
    {
	this.replaceMovement( new movement( this.orientation.multiply( -1 ) ) );
	this.orientation = this.orientation.multiply( -1 );
    }
      ////////////
    if ( event.keyCode == 87 ) ///'w' UP
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'up' );
      else
      {
// 	this.orientation = new vector( 0, -1 );
	this.replaceMovement( new arrowMovement( 'up' ) );
      }
    else if ( event.keyCode == 83 ) ///'s' DOWN
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'down' );
      else
      {
// 	this.orientation = new vector( 0, 1 );
	this.replaceMovement( new arrowMovement( 'down' ) );
      }
    if ( event.keyCode == 68 ) ///'d' RIGHT
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'right' );
      else
      {
// 	this.orientation = new vector( 1, 0 );
	this.replaceMovement( new arrowMovement( 'right' ) );
      }
    else if ( event.keyCode == 65 ) ///'a' LEFT
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'left' );
      else
      {
// 	this.orientation = new vector( -1, 0 );
	this.replaceMovement( new arrowMovement( 'left' ) );
      }
    ///////////////////////////////////////////////////////////////

    if ( event.keyCode == 73 ) ///'i' ACCELERATE AND BEGIN 'CAR MODE'
    {
      if ( !this.movementList[0] )
	this.addMovement( new carMovement( this.orientation ) );
      this.movementList[0].accelState = 'accelerating';
    }
    if ( event.keyCode == 75 ) ///'k' DECCELERATE
    {
      if ( this.movementList[0] )
      {
	  this.movementList[0].accelState = 'deccelerating';
      }
    }
    if ( event.keyCode == 76 || event.keyCode == 72 ) ///'l' STIR RIGHT
    {
      if ( this.movementList[0] instanceof carMovement )
	this.movementList[0].stirState = 'rotateRight';
      this.rotation = new rotation( shiftAngle );
    }
    if ( event.keyCode == 74 || event.keyCode == 70  ) ///'j' STIR LEFT
    {
      if ( this.movementList[0] && this.movementList[0] instanceof carMovement )
	this.movementList[0].stirState = 'rotateLeft';
      this.rotation = new rotation( -shiftAngle );
    }
    if ( event.keyCode == 13 )	///'enter' CHASE
    {
      this.chase( elementList[1] );
    }
    if ( event.keyCode == 32 )	///'space' GO RANDOM
    {
      if ( !this.movementList[0] )
	this.addMovement( new movement( this.orientation ) );
// 	this.movementList[0].randomSpeed();
      this.movementList[0].randomCurv();
    }
    if ( event.keyCode == 67 )	///'c' ADD CIRCLE COMPONENT
    {
      if ( !this.movementList[0] )
	this.addMovement( new circleMovement() );
      else
	this.movementList[0].components.push( new circleMovement() );
    }
    if ( event.keyCode == 90 )	///'z' FOCUS ELEMENT IN SCREEN VIEW
      scene.focus( this );

    if ( event.keyCode == 88 )	///'x' TOGGLE 'FOLLOW ELEMENT WITH CAMERA', CENTERED WITH 'CTRL'
    {
      if ( scene.followedObj !== this )
	scene.follow( this, event.ctrlKey );
      else
	scene.unfollow();
    }
     if ( event.keyCode == 8 ) //'backspace'
       this.rotation = new rotation( 3*shiftAngle , 0.005 );
}

element.prototype.keyStop = function( event )
{
     if ( event.keyCode == 84 || event.keyCode == 71 )
      this.setState ( 'stopped' );
    if ( this.movementList[0] )
    {
      if ( event.keyCode == 87 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'up', false );
      if ( event.keyCode == 83 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'down', false );
      if ( event.keyCode == 68 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'right', false );
      if ( event.keyCode == 65 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'left', false );
      if ( event.keyCode == 73 || event.keyCode == 75 )
	this.movementList[0].accelState = 'none';
      if (  event.keyCode == 74 || event.keyCode == 76  )
	this.movementList[0].stirState = 'none';
    }
    if (  event.keyCode == 74  || event.keyCode == 76  || event.keyCode == 70  || event.keyCode == 72 )
      this.rotation = undefined;

//     if ( !this.keyHandler )
//     {
// 	var that = this;
// 	document.addEventListener( 'keydown', function ( event ){ that.keyHandler = arguments.callee; that.key( event ) }, false );
//     }
}

function character( id, coordinates )          /// Character constructor, from SVG element with id 'id' in SVG DOM tree.
{
  element.call( this, id, coordinates );

  this.lArm = document.getElementById( id + 'leftarm' );
  this.rArm = document.getElementById( id + 'rightarm');
  this.lLeg = document.getElementById( id + 'leftleg' );
  this.rLeg = document.getElementById( id + 'rightleg');
  this.head = document.getElementById( id + 'head'    );

  this.lArmAxis = new vector( this.lArm.getAttribute( 'lArmAxisX' )-0 , this.lArm.getAttribute( 'lArmAxisY' )-0 	);
  this.rArmAxis = new vector( this.rArm.getAttribute( 'rArmAxisX' )-0 , this.rArm.getAttribute( 'rArmAxisY' )-0 	);
  this.headAxis = new vector( this.head.getAttribute( 'headX' )-0     , this.head.getAttribute( 'headY' )-0 	);

  this.lAngleArm = 0;
  this.rAngleArm = 0;
  this.headAngle = 0;
  this.lLegStretch = 1;
  this.rLegStretch = 1;

  this.headFlag = true;
  this.lArmFlag = true;
  this.rArmFlag = true;
  this.lLegFlag = true;
  this.rLegFlag = true;

  this.headRange = 2;
  this.StretchRange = 0.02;
}

character.prototype = new element();		//new objects created with 'new' and this function will have this obj as their prototype to look up to
character.prototype.constructor = character;    //we want to state that the constructor of 'character' objects is character(), not element()

character.prototype.animate = function ( animate )    ///Performs 'animation', or the animation corresponding to the current state if no parameters
{
    if ( animate )
      this.animation = animate;
    if ( this.animation == 'moving' )
    {
      if ( this.lAngleArm <= -115 )
	this.lArmFlag = false;
      if ( this.lArmFlag )
	this.lAngleArm -= 115/photogramsPerCycle;
      else
	this.lAngleArm += 115/photogramsPerCycle;
      if ( this.lAngleArm >= 0 )
	this.lArmFlag = true;
      //////////////////////////////////////////
      if ( this.rAngleArm >= 120 )
	this.rArmFlag = false;
      if ( this.rArmFlag )
	this.rAngleArm += 120/photogramsPerCycle;
      else
	this.rAngleArm -= 120/photogramsPerCycle;
      if ( this.rAngleArm <= 0 )
	this.rArmFlag = true;
      //////////////////////////////////////////
      if ( this.lLegStretch <= 1 - this.StretchRange )
	this.lLegFlag = false;
      if ( this.lLegFlag )
	this.lLegStretch -= 0.01;
      else
	this.lLegStretch += 0.01;
      if ( this.lLegStretch >= 1 + this.StretchRange )
	this.lLegFlag = true;
      ////////////////////////////////////////
      if ( this.rLegStretch <= 1 - this.StretchRange )
	this.rLegFlag = true;
      if ( this.rLegFlag )
	this.rLegStretch += 0.01;
      else
	this.rLegStretch -= 0.01;
      if ( this.rLegStretch >= 1 + this.StretchRange )
	this.rLegFlag = false;


      this.lArm.setAttribute( 'transform', 'rotate( ' + this.lAngleArm + ' ,'+this.lArmAxis.x+', '+ this.lArmAxis.y +')' );
      this.rArm.setAttribute( 'transform', 'rotate( ' + this.rAngleArm + ' ,'+this.rArmAxis.x+', '+ this.rArmAxis.y +')' );
      this.lLeg.setAttribute( 'transform', ' scale(1,'+ this.lLegStretch +')' );
      this.rLeg.setAttribute( 'transform', ' scale(1,'+ this.rLegStretch +')' );
    }
    /////////////////////////////////////////
    if ( this.animation == 'stopped' )
    {
      if ( this.headAngle > this.headRange )
	this.headFlag = false;
      if ( this.headFlag )
	this.headAngle += 5*this.headRange/photogramsPerCycle;
      else
	this.headAngle -= 5*this.headRange/photogramsPerCycle;
      if ( this.headAngle < -this.headRange )
	this.headFlag = true;

      this.head.setAttribute( 'transform', 'rotate( ' + this.headAngle + ' ,'+ this.headAxis.x + ', ' + this.headAxis.y +')' );
    }
}
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function keystop( event )
{
    if ( event.keyCode == 33 || event.keyCode == 34 )
      scene.zoomState = 'none';
    if (  event.keyCode == 37  || event.keyCode == 38  || event.keyCode == 39  || event.keyCode == 40  )
      scene.panState = 'none';
//     document.addEventListener( 'keydown', 	keyboard, 	false );
}

function keyboard( event )
{
//     document.removeEventListener( 'keydown', keyboard, false );

    /******************ZOOMING***********************/

    if ( event.keyCode == 40 && scene.scroll.y + scene.viewBoxHeight/2 <= scene.mapSizeY )         ///down
      scene.panState = 'down';
    if ( event.keyCode == 38 && scene.scroll.y >= scene.viewBoxHeight/2		) ///up
      scene.panState = 'up';
    if ( event.keyCode == 39 && scene.scroll.x + scene.viewBoxWidth/2<= scene.mapSizeX ) 	  ///right
      scene.panState = 'right';
    if ( event.keyCode == 37 && scene.scroll.x >= scene.viewBoxWidth/2		) ///left
      scene.panState = 'left';

    if ( event.keyCode == 34 )		 ///PG_DOWN ZOOM IN
      scene.zoomState = 'zoomIn';
    if ( event.keyCode == 33 )		 ///PG_UP ZOOM OUT
      scene.zoomState = 'zoomOut';

    /*************OTHER******************************/

    if ( event.keyCode == 49 ) //'1'
    {
      selectAll( false );
      if ( elementList[0] )
      {
	elementList[0].setSelected( true );
	scene.focus( elementList[0] );
      }
    }
    if ( event.keyCode == 50 ) //'2'
    {
      selectAll( false );
      if ( elementList[1] )
      {
	elementList[1].setSelected( true );
	scene.focus( elementList[1] );
      }
    }
    if ( event.keyCode == 51 ) //'3'
    {
      selectAll( false );
      if ( elementList[2] )
      {
	elementList[2].setSelected( true );
	scene.focus( elementList[2] );
      }
    }
    if ( event.keyCode == 52 ) //'4'
    {
      selectAll( false );
      if ( elementList[3] )
      {
	elementList[3].setSelected( true );
	scene.focus( elementList[3] );
      }
    }
    if ( event.keyCode == 53 ) //'5'
    {
      selectAll( false );
      if ( elementList[4] )
      {
	elementList[4].setSelected( true );
	scene.focus( elementList[4] );
      }
    }
    if ( event.keyCode == 54 ) //'6'
    {
      selectAll( false );
      if ( elementList[5] )
      {
	elementList[5].setSelected( true );
	scene.focus( elementList[5] );
      }
    }
    if ( event.keyCode == 55 ) //'7'
    {
      selectAll( false );
      if ( elementList[6] )
      {
	elementList[6].setSelected( true );
	scene.focus( elementList[6] );
      }
    }
    if ( event.keyCode == 56 ) //'8'
    {
      selectAll( false );
      if ( elementList[7] )
      {
	elementList[7].setSelected( true );
	scene.focus( elementList[7] );
      }
    }
    if ( event.keyCode == 57 ) //'9'
    {
      selectAll( false );
      if ( elementList[8] )
      {
	elementList[8].setSelected( true );
	scene.focus( elementList[8] );
      }
    }
    if ( event.keyCode == 48 ) //'0'
    {
      selectAll( false );
      if ( elementList[9] )
      {
	elementList[9].setSelected( true );
	scene.focus( elementList[9] );
      }
    }
}

function mouseClick( event )	//click on the map causes selected elements to move there immediately, later(shift). Curvedly with ctrl
{
    event.preventDefault();
    event.stopPropagation();

    var screenCoords = new vector( event.clientX, event.clientY );

    if ( event.button == '0' ) //left button - move selected to position
      for ( var i = 0 ; i < elementList.length ; i++ )
	if ( elementList[i].selected )
	  elementList[i].moveTo( scene.fromScreen( screenCoords ) , event.shiftKey, event.ctrlKey );

    if ( event.button == '2' ) //right button - center camera in position
      scene.zoom( scene.fromScreen( screenCoords ) );
    return false;
}

function mouseMove( event )
{
    if ( event.clientX <= 5 )
      scene.panState = 'left';
    else if ( event.clientX >= window.innerWidth -5 )
      scene.panState = 'right';
    else if ( event.clientY <= 5 )
      scene.panState = 'up';
    else if ( event.clientY >= window.innerHeight -5 )
      scene.panState = 'down';
    else
      scene.panState = 'none';
}

function wheel ( event )
{
    if ( scene.followedObj instanceof element ) ///element selected, zoom to element position
    {
      if ( event.detail > 0 )
	scene.zoomIn( scene.followedObj.getPosition() );
      else
	scene.zoomOut( scene.followedObj.getPosition() );
    }
    else					/// zoom to mouse position
    {
      var aux = new vector( scene.viewBoxWidth, scene.viewBoxHeight );
      aux = aux.multiply( ( scene.zoomFactor - 1 )/2 );

      var aux2 = new vector ( event.clientX*scene.viewBoxWidth/window.innerWidth, event.clientY*scene.viewBoxHeight/window.innerHeight );
      aux2 = aux2.multiply( 1 - scene.zoomFactor );

      if ( event.detail > 0 )
	scene.zoomIn( scene.scroll.add( aux ).add( aux2 ) );
      else
	scene.zoomOut( scene.scroll.minus( aux ).minus( aux2 ) );
    }
}

////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
/////*************************************************************************************************************\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function map( id, viewBoxCoords, viewBoxSizeX, viewBoxSizeY ) ///coordinates are CENTER of the view box
{
      if ( !id ) return;
      this.SVGNode = document.getElementById( id );
      this.id = id;
      this.type = this.SVGNode.getAttribute( 'map' );
      this.SVGNode.setAttribute( 'x', 0 );
      this.SVGNode.setAttribute( 'y', 0 );
      this.SVGNode.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );  ///keep aspect ratio when stretching

      ////////////////////////////////
      this.zoomFactor = 0.95;
      this.zoomState = 'none';
      this.panState = 'none';
      this.followedObj = undefined;
      this.centerObj = false;
      this.maxZoom = 10;

      ///////////////////////////////

      this.mapSizeX = this.SVGNode.getAttribute( 'width' )-0;			///Get the original dimensions, these are PROPORTIONAL to the REAL drawing.
      this.mapSizeY = this.SVGNode.getAttribute( 'height' )-0;			///Use these for boundary checks.

      if ( !this.mapSizeX || this.mapSizeX == '100%' )				///Just in case, but the boundary checks won't work properly if these dimensions
	this.mapSizeX = window.innerWidth;					///are not set from the SVG document
      if ( !this.mapSizeY || this.mapSizeY == '100%' )
	this.mapSizeY = window.innerHeight;

      /////////////////////////////////

      this.SVGNode.setAttribute( 'width', window.innerWidth );			///Adjust the drawing to the screen.
      this.SVGNode.setAttribute( 'height',window.innerHeight );			///One of these dimensions will NOT be proportional to the drawing.

      ///SET THE INITIAL VIEW BOX
      if ( viewBoxCoords && viewBoxSizeX  )
      {
	this.viewBoxWidth = viewBoxSizeX;
	if ( !viewBoxSizeY )
	  this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
	else
	{
	  this.viewBoxHeight = viewBoxSizeY;
	  this.adjustViewBox();
	}
	this.scroll = viewBoxCoords;
      }
      else
      {
	var params = this.SVGNode.getAttribute( 'viewBox' );
	if ( params )
	{
	  params = params.split(' ');
	  this.viewBoxWidth = params[2]-0;
	  this.viewBoxHeight = params[3]-0;
	  this.adjustViewBox();
	  this.scroll = new vector ( params[0] + this.viewBoxWidth/2, params[1] + this.viewBoxHeight/2 ) ;
	}
	else
	{
	  this.viewBoxWidth  = this.mapSizeX;
	  this.viewBoxHeight = this.mapSizeY;
	  this.adjustViewBox();
	  this.scroll = new vector( this.viewBoxWidth/2, this.viewBoxHeight/2 );
	}
      }
     this.setViewBox();
}

map.prototype.adjustViewBox = function ()
{
    ///Make viewBox no bigger than map and no smaller than maxZoom
    if ( this.viewBoxHeight >= this.viewBoxWidth && this.viewBoxWidth <= this.maxZoom )
	this.viewBoxWidth = this.maxZoom;

    else if ( this.viewBoxHeight < this.viewBoxWidth && this.viewBoxHeight <= this.maxZoom )
	this.viewBoxHeight = this.maxZoom;

    if ( this.viewBoxHeight <= this.viewBoxWidth && this.viewBoxWidth > this.mapSizeX )
	this.viewBoxWidth = this.mapSizeX;
    if ( this.viewBoxHeight > this.viewBoxWidth && this.viewBoxHeight > this.mapSizeY )
	this.viewBoxHeight = this.mapSizeY;

    ///Adjusts viewBox proportionally to the screen
    if  ( ( this.viewBoxWidth/this.viewBoxHeight > 1 &&  window.innerWidth/window.innerHeight < 1 ) ||
      ( this.viewBoxWidth/this.viewBoxHeight > window.innerWidth/window.innerHeight &&
      ( ( this.viewBoxWidth/this.viewBoxHeight > 1 &&  window.innerWidth/window.innerHeight > 1 ) ||
      ( this.viewBoxWidth/this.viewBoxHeight < 1 &&  window.innerWidth/window.innerHeight < 1 ) ) ) )
    {
      this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    }
    else
      this.viewBoxWidth  = this.viewBoxHeight*window.innerWidth/window.innerHeight;
}

map.prototype.setViewBox = function ( newPoint, newWidth, newHeight )			 //Set viewBox according to inner variables or input parameters.
{
    if ( newWidth )
    {
      this.viewBoxWidth = newWidth;
      if ( newHeight )
	this.viewBoxHeight = newHeight;
      else
	this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    }
    if ( newPoint )
      this.scroll = new vector( newPoint.x, newPoint.y );

    this.adjustViewBox();
    this.adjustScroll();
    this.SVGNode.setAttribute( 'viewBox',
			     ( this.scroll.x -this.viewBoxWidth/2 ) +' '+
			     ( this.scroll.y -this.viewBoxHeight/2 ) +' '+
				this.viewBoxWidth +' '+ this.viewBoxHeight );
}

map.prototype.adjustScroll = function () 				 ///adjusts scrolls so that the camera does not go out of the map
{
  if ( this.scroll.x + this.viewBoxWidth/2 > this.mapSizeX )
    this.scroll.x = this.mapSizeX  - this.viewBoxWidth/2;
  if ( this.scroll.y + this.viewBoxHeight/2 > this.mapSizeY )
    this.scroll.y = this.mapSizeY - this.viewBoxHeight/2;

  if ( this.scroll.x < this.viewBoxWidth/2 )
    this.scroll.x = this.viewBoxWidth/2;
  if ( this.scroll.y < this.viewBoxHeight/2 )
    this.scroll.y = this.viewBoxHeight/2;
}

map.prototype.fromScreen = function( screenCoords )
{
     var x =  screenCoords.x*this.viewBoxWidth/window.innerWidth + this.scroll.x - this.viewBoxWidth/2 ;
     var y =  screenCoords.y*this.viewBoxHeight/window.innerHeight + this.scroll.y - this.viewBoxHeight/2 ;
  return ( new vector( x, y ) );
}

map.prototype.zoomIn = function( pos, zoomFactor )
{
  zoomFactor = zoomFactor || this.zoomFactor;

  if ( this.viewBoxWidth > this.maxZoom && this.viewBoxHeight > this.maxZoom )
  {
    this.viewBoxWidth  *= zoomFactor;
    this.viewBoxHeight *= zoomFactor;

    if ( pos instanceof vector )
      this.scroll = pos;
    else if ( this.followedObj instanceof element )
      this.scroll = this.followedObj.pos;

      this.setViewBox();
  }
}

map.prototype.zoomOut = function( pos, zoomFactor )
{
  zoomFactor = zoomFactor || this.zoomFactor;
  if ( this.viewBoxWidth < this.mapSizeX || this.viewBoxHeight < this.mapSizeY )
  {
    this.viewBoxWidth /= zoomFactor;
    this.viewBoxHeight /= zoomFactor;

    if ( pos instanceof vector )
      this.scroll = pos;
    else if ( this.followedObj instanceof element )
      this.scroll = this.followedObj.pos;

    this.setViewBox();
  }
}

map.prototype.zoom = function ( newPoint, newSizeX, newSizeY )	///set camera to this position if parameters, perform zoomState otherwise.
{
  if( newPoint )
    this.setViewBox( newPoint, newSizeX, newSizeY );
  else if ( this.zoomState == 'zoomIn' )
    this.zoomIn();
  else if ( this.zoomState == 'zoomOut' )
    this.zoomOut();
}

map.prototype.setMaxZoom = function ( object ) ///sets max zoom to 1.5x the size of the input object, or the biggest selected element, (or to a number)
{
    if ( typeof object == "number" )
      this.maxZoom = object;
    else
    {
      var list = [];

      if ( object instanceof element )
	list = new Array( object );
      else
	list = selectedList;

      if ( list.length > 0 )
	this.maxZoom = 0;

      for ( var i = 0 ; i < list.length ; i++ )
      {
	if ( list[i].height >= list[i].width && list[i].height*3/2 > this.maxZoom )
	    this.maxZoom = list[i].height*3/2;
	else if ( list[i].width > list[i].height && list[i].width*3/2 > this.maxZoom )
	    this.maxZoom = list[i].width*3/2;
      }
    }
    this.adjustZoom();
}

map.prototype.adjustZoom = function()	///adjusts if the current zoom is too big
{
    if ( this.viewBoxWidth < this.maxZoom )
      this.viewBoxWidth  = this.maxZoom;
    if ( this.viewBoxHeight < this.maxZoom )
      this.viewBoxHeight = this.maxZoom;
    if ( this.viewBoxWidth == this.maxZoom || this.viewBoxHeight == this.maxZoom )
      this.setViewBox();
}

map.prototype.focus = function ( object, level )
{
  var level = level || 3;
  this.setViewBox( object.pos, object.width*level, object.height*level );
}

map.prototype.pan = function( direction )
{
  if ( !this.followedObj )
  {
    direction =  direction || this.panState;
    if ( direction == 'down' )
      this.scroll.y += this.viewBoxHeight/panSteps;
    if ( direction == 'up' )
      this.scroll.y -= this.viewBoxHeight/panSteps;
    if ( direction == 'right' )
      this.scroll.x += this.viewBoxWidth/panSteps;
    if ( direction == 'left' )
      this.scroll.x -= this.viewBoxWidth/panSteps;
  }
  else
    this.follow();

  this.setViewBox();
}

map.prototype.follow = function ( object, centered )			///set followed object and if the camera is centered, and/or perform the tracking.
{
    ///SET THE FOLLOWING PARAMETERS
    if ( centered != undefined )
      this.centerObj = centered;
    if ( object instanceof element )
      this.followedObj = object;

    else if ( this.followedObj )
    {
      ///ADJUST SCROLL
      if ( !this.centerObj )
      {
	var marginX = (this.viewBoxWidth - this.followedObj.width)/4.0;
	var marginY = (this.viewBoxHeight- this.followedObj.height)/4.0;

	if ( this.followedObj.pos.x + this.followedObj.width/2 + marginX > this.scroll.x + this.viewBoxWidth/2 )
	  this.scroll.x = this.followedObj.pos.x + this.followedObj.width/2 + marginX - this.viewBoxWidth/2;

	if ( this.followedObj.pos.x - this.followedObj.width/2 - marginX < this.scroll.x - this.viewBoxWidth/2 )
	  this.scroll.x = this.followedObj.pos.x - this.followedObj.width/2 - marginX + this.viewBoxWidth/2;

	if ( this.followedObj.pos.y + this.followedObj.height/2 + marginY > this.scroll.y + this.viewBoxHeight/2 )
	  this.scroll.y = this.followedObj.pos.y + this.followedObj.height/2 + marginY - this.viewBoxHeight/2;

	if ( this.followedObj.pos.y - this.followedObj.height/2 - marginY < this.scroll.y - this.viewBoxHeight/2 )
	  this.scroll.y = this.followedObj.pos.y - this.followedObj.height/2 - marginY + this.viewBoxHeight/2;
      }
      else
      {
	if ( this.followedObj.pos.x != this.scroll.x )
	  this.scroll.x = this.followedObj.pos.x;

	if ( this.followedObj.pos.y != this.scroll.y )
	  this.scroll.y = this.followedObj.pos.y;
      }
      this.adjustZoom();
      this.adjustScroll();
  }
}

map.prototype.unfollow = function ()
{
  this.followedObj = undefined
}