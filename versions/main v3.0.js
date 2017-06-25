//	TODO
//	====
//	* task lists
//		-Collisions and inertia
//		-Rotatory movements and moments of inertia
//	* selecting box
//	* centered zoom
//	* for some reason, 'keyup' fires upon holding a key pressed, this prevents me from disabling events
//	* collision detection
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
  scene = allList.find( map ,'main')[0];
  elementList = allList.find( element );
  objectList = elementList.find( element, 'object' );
  characterList = elementList.find( element , 'character' );
  animatedElementList = characterList;
  selectedList = [];
//   subject = characterList.search( 'subject' );

  ///error check
  if ( !scene ) return;

  ///SET EVENTS
  document.addEventListener( 'keydown', 	keyboard, 	false );
  document.addEventListener( 'keyup', 		keystop, 	false );
  document.addEventListener( 'mousedown', 	mouse, 		false );
  document.addEventListener( 'DOMMouseScroll',	wheel,		false );
//   document.addEventListener( 'mousemove',	mouseScroll,	false );


  setInterval( 'drawFrame()', 50 );
}

  //GENERAL CONFIGURATION
//scene.maxZoom = subject.height;
//subject.speed = scene.viewBoxWidth/moveSteps;
  photogramsPerCycle = 10;
  panSteps = 200;
  shiftAngle = 5*Math.PI/180;
  baseAngShift = 5*Math.PI/180;
  baseSpeed = 1;
  baseAccel = 0.2;


function drawFrame()
{
  doMovements();
  doAnimations();
  scene.pan();
  scene.zoom();
}

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
    var returnList = new Array();

    var j=0;
    for ( var i = 0 ; i < this.length ; i++ )
      if ( ( !class || this[i].constructor == class  ) && ( !type || this[i].type == type ) )
	returnList.push( this[i] );
    return returnList;
}

//////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

function vector( x, y )
{
    if ( x )
      this.x = parseFloat( x );
    else
      this.x = 0.0;
    if ( y )
      this.y = parseFloat( y );
    else
      this.y = 0.0;
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

vector.prototype.angle = function()
{
    if ( this.x < 0 )
      var shift = Math.PI;
    else
      var shift = 0;
    var value = ( shift + Math.atan( this.y/this.x ) );
    return value;
}

vector.prototype.rotate = function ( shiftAngle )
{
    shiftAngle 	= shiftAngle || baseAngShift;
    var newAngle= this.angle() + shiftAngle;
    var newModulus = this.modulus();
    this.x = newModulus*Math.cos( newAngle );
    this.y = newModulus*Math.sin( newAngle );
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
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////////////////////////////////

function movement ( initialDir, speed, friction )
{
    this.speed 		= speed || baseSpeed;
    this.direction 	= initialDir || new vector( 1, 0 );
    this.friction 	= friction || 0;
    this.accelState 	= 'none';
    this.components	= [];		//list with extra components to the movement, to add vectorially

    this.RAngle	= undefined;
    this.RCurv	= undefined;
    this.RSpeed	= undefined;
}

movement.prototype.advance = function () ///Returns the increment for each frame
{
  //Modifiers
  if ( this.accelState == 'accelerating' )
    this.accelerate();
  else if ( this.accelState == 'deccelerating' )
    this.deccelerate();

  //Random components
  if ( this.RSpeed || this.RCurv || this.RAngle )
    this.randomize();
  if ( this.RCurv )
    this.direction.rotate( this.curvature*this.speed );

  var result = this.direction.multiply( this.speed );

  //Add other components
  if ( this.components )
    for ( var i = 0 ; i < this.components.length ; i++ )
      result = result.add( this.components[i].advance() );

  return result;
}

movement.prototype.isFinished = function ()
{
    if ( this.speed == 0 || this.state == 'finished' )
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
      this.speed = 0;		//this will end and eliminate the movement from the list when move() is invoked
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

arrowMovement.prototype.addDir = function( dir, add )//add/substract a component to the movement and return resulting direction
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
  this.direction.rotate( -1*Math.PI/2 );
  this.radius 		= this.distance/2; //Max curvature TODO input radius for more complexity
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
    this.direction.rotate( -1*shiftAngle );

  if ( this.friction > 0 && this.accelState == 'none' )
    this.deccelerate( this.friction )

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
    var increment = this.position.minus( this.target.pos );
    if ( increment.modulus() <= 10 )			///threshold
      result = true;
    return result;
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
  this.rotating		= 'none';

  this.orientation	= new vector( 1, 0 );
  this.movementList	= [];

  ///DIMENSIONS AND LOCATION
  this.height 	= this.SVGNode.getAttribute( 'height' ) || 10.0;
  this.width  	= this.SVGNode.getAttribute( 'width'  ) || this.height*window.innerWidth/window.innerHeight;

  if ( coordinates )
  {
    this.pos = coordinates;
    this.SVGNode.setAttribute( 'x', this.pos.x - this.width/2  );
    this.SVGNode.setAttribute( 'y', this.pos.y - this.height/2 );
  }
  else
  {
    var readX = this.SVGNode.getAttribute( 'x' ) || 0;
    var readY = this.SVGNode.getAttribute( 'y' ) || 0;

    this.pos = new vector( readX + this.width/2, readY + this.height/2 );
  }
  this.keyHandler = undefined;
  this.keyStopHandler = undefined;
  var that = this;
  this.SVGNode.addEventListener( 'mousedown', function ( event ){ that.mouse( event ) }, false );
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

element.prototype.setState = function ( newState, newAnimation )
{
  this.state = newState || 'stopped';
  switch ( this.state )
  {
    case 'moving' :
      this.animation = newAnimation || 'moving';
      break;
    default :
      this.animation = newAnimation  || 'stopped';
      this.cancelMovements();
  }
  if ( newAnimation )
    this.animation = animation;
}

element.prototype.setPosition = function ( newPos )
{
  this.pos = newPos;
  this.SVGNode.setAttribute( 'x', newPos.x - this.width/2  );
  this.SVGNode.setAttribute( 'y', newPos.y - this.height/2 );
}

element.prototype.addMovement = function( newMovement )
{
    if ( newMovement && newMovement instanceof movement )
    {
      this.movementList.push( newMovement );
      if ( this.movementList.length == 1 )
	this.orientation = this.movementList[0].direction;
    }
}

element.prototype.replaceMovement = function( newMovement )
{
    if ( newMovement && newMovement instanceof movement )
    {
      this.cancelMovements();
      this.addMovement( newMovement );
      this.orientation = this.movementList[0].direction;
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
    if ( !newMove )
    {
      this.setPosition ( this.pos.add( this.movementList[0].advance() ) );
      if ( this.movementList[0].isFinished() )
	this.finishMovement();
    }
    else
      this.addMovement( newMove );				//add a new movement to the element, provided for convenience

    ///OTHER MODIFIERS
//     if ( this.rotating == 'right' )//TODO put in different place.make a task listing system where movement is 1 task
//       this.orientation.rotate( shiftAngle );
//     if ( this.rotating == 'left' )
//       this.orientation.rotate( -1*shiftAngle );
}

element.prototype.chase = function ( targetObj, speed )
{
    this.replaceMovement( new chaseMovement( this.pos, targetObj, speed ) );
}

element.prototype.hits = function( checkPoint )
{
    var result = false;
    if ( checkPoint && checkPoint instanceof vector )
    {
	var increment = this.pos.minus( checkPoint );
	if ( increment.modulus() <= 10 )			///threshold
	  result = true;
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

    if ( event.keyCode == 84 ) ///'t' FORWARDS
    {
	this.replaceMovement( new movement( this.orientation ) );
	this.setState ( 'moving' );
    }
    if ( event.keyCode == 71 ) ///'g' BACKWARDS
    {
	this.replaceMovement( new movement( this.orientation.multiply( -1 ) ) );
	this.orientation = this.orientation.multiply( -1 );
	this.setState ( 'moving' );
    }
      ////////////
    if ( event.keyCode == 87 ) ///'w' UP
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'up' );
      else
      {
	this.orientation = new vector( 0, -1 );
	this.replaceMovement( new arrowMovement( 'up' ) );
	this.setState ( 'moving' );
      }
    else if ( event.keyCode == 83 ) ///'s' DOWN
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'down' );
      else
      {
	this.orientation = new vector( 0, 1 );
	this.replaceMovement( new arrowMovement( 'down' ) );
	this.setState ( 'moving' );
      }
    if ( event.keyCode == 68 ) ///'d' RIGHT
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'right' );
      else
      {
	this.orientation = new vector( 1, 0 );
	this.replaceMovement( new arrowMovement( 'right' ) );
	this.setState ( 'moving' );
      }
    else if ( event.keyCode == 65 ) ///'a' LEFT
      if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
	this.movementList[0].addDir( 'left' );
      else
      {
	this.orientation = new vector( -1, 0 );
	this.replaceMovement( new arrowMovement( 'left' ) );
	this.setState ( 'moving' );
      }
    ///////////////////////////////////////////////////////////////

    if ( event.keyCode == 73 ) ///'i' ACCELERATE AND BEGIN 'CAR MODE'
    {
      if ( !this.movementList[0] )
	this.addMovement( new carMovement( this.orientation ) );
      this.movementList[0].accelState = 'accelerating';
      this.setState ( 'moving' );
    }
    if ( event.keyCode == 75 ) ///'k' DECCELERATE
    {
      if ( this.movementList[0] )
      {
	  this.movementList[0].accelState = 'deccelerating';
	  this.setState ( 'moving' );
      }
    }
    if ( event.keyCode == 76 ) ///'l' STIR RIGHT
    {
      if ( this.movementList[0] && this.movementList[0] instanceof carMovement )
	this.movementList[0].stirState = 'rotateRight';
      this.rotating = 'right';
    }
    if ( event.keyCode == 74 ) ///'j' STIR LEFT
    {
      if ( this.movementList[0] && this.movementList[0] instanceof carMovement )
	this.movementList[0].stirState = 'rotateLeft';
      this.rotating = 'left';
    }
    if ( event.keyCode == 13 )	///'enter' CHASE
    {
      this.chase( elementList[1] );
      this.setState ( 'moving' );
    }
    if ( event.keyCode == 32 )	///'space' GO RANDOM
    {
      if ( !this.movementList[0] )
	this.addMovement( new movement( this.orientation ) );
// 	this.movementList[0].randomSpeed();
      this.movementList[0].randomCurv();
      this.setState ( 'moving' );
    }
    if ( event.keyCode == 67 )	///'c' ADD CIRCLE COMPONENT
    {
      if ( !this.movementList[0] )
	this.addMovement( new circleMovement() );
      else
	this.movementList[0].components.push( new circleMovement() );
      this.setState ( 'moving' );
    }
    if ( event.keyCode == 90 )	///'z' FOCUS ELEMENT IN SCREEN VIEW
      scene.focus( this );
    if ( event.keyCode == 88 )	///'x' TOGGLE 'FOLLOW ELEMENT WITH CAMERA'
    {
      if ( scene.followedObj !== this )
	scene.follow( this, true );
      else
	scene.followedObj = undefined;
    }
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
    if (  event.keyCode == 74  || event.keyCode == 76 )
      this.rotating = 'none';

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
      if ( objList[i].movementList[0] )
	objList[i].move();
}

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
      elementList[0].setSelected( true );
      elementList[1].setSelected( false );
    }

    if ( event.keyCode == 50 ) //'2'
    {
       elementList[1].setSelected( true );
       elementList[0].setSelected( false );
    }


//     if ( event.keyCode == 32 )		 ///SPACE
//       scene.focus( subject );
}

function mouse( event )	//click on the map causes selected elements to move there immediately, later(shift). Curvedly with ctrl
{
  var screenCoords = new vector( event.clientX, event.clientY );
  for ( var i = 0 ; i < elementList.length ; i++ )
    if ( elementList[i].selected )
      elementList[i].moveTo( scene.fromScreen( screenCoords ) , event.shiftKey, event.ctrlKey );
}

function wheel ( event )
{
    if ( event.detail > 0 )
      scene.zoomIn();
    else
      scene.zoomOut();
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
      this.maxZoom = 10;
      this.zoomState = 'none';
      this.panState = 'none';
      this.followedObj = undefined;
      this.centerObj = false;

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

    ///Make viewBox no bigger than map TODO
//     if ( this.viewBoxWidth > this.mapSizeX || this.viewBoxHeight > this.mapsizeY )
//     {
//       this.viewBoxWidth  = this.mapSizeX;
//       this.viewBoxHeight = this.mapsizeY;
//     }
}

map.prototype.setViewBox = function ( newPoint, newWidth, newHeight )			 //Set viewBox according to inner variables or input parameters.
{
    if ( newWidth )
    {
      this.viewBoxWidth = newWidth;
      if ( newHeight )
      {
	this.viewBoxHeight = newHeight;
	this.adjustViewBox();
      }
      else
	this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    }
    if ( newPoint )
    this.scroll = new vector( newPoint.x, newPoint.y );

    this.boundaryCheck();
    this.SVGNode.setAttribute( 'viewBox',
			     ( this.scroll.x -this.viewBoxWidth/2 ) +' '+
			     ( this.scroll.y -this.viewBoxHeight/2 ) +' '+
				this.viewBoxWidth +' '+ this.viewBoxHeight );
}

map.prototype.boundaryCheck = function () 				 ///adjusts scrolls so that the camera does not go out of the map
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
     var x =  this.viewBoxWidth*screenCoords.x/window.innerWidth + this.scroll.x -this.viewBoxWidth/2 ;
     var y =  this.viewBoxHeight*screenCoords.y/window.innerHeight + this.scroll.y -this.viewBoxHeight/2 ;
  return ( new vector( x, y ) );
}

map.prototype.zoomIn = function( zoomFactor )
{
  zoomFactor = zoomFactor || this.zoomFactor;
  if ( this.viewBoxWidth > this.maxZoom || this.viewBoxHeight > this.maxZoom )
  {
    this.viewBoxWidth  *= zoomFactor;
    this.viewBoxHeight *= zoomFactor;

    this.setViewBox();
  }
}

map.prototype.zoomOut = function( zoomFactor )
{
  zoomFactor = zoomFactor || this.zoomFactor;
  if ( this.viewBoxWidth < this.mapSizeX || this.viewBoxHeight < this.mapSizeY )
  {
    this.viewBoxWidth /= zoomFactor;
    this.viewBoxHeight /= zoomFactor;

    this.setViewBox();
  }
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

map.prototype.zoom = function ( newPoint, newSizeX, newSizeY )	///set camera to this position if parameters, perform zoomState otherwise.
{
  if( newPoint && newSizeX && newSizeY )
    this.setViewBox( newPoint , newSizeX, newSizeY );
  else if ( this.zoomState == 'zoomIn' )
    this.zoomIn();
  else if ( this.zoomState == 'zoomOut' )
    this.zoomOut();
}

map.prototype.focus = function ( object, level )	//TODO avoid focus out of the screen
{
  var level = level || 5;
  var boxWidth = object.width*level;
  var boxHeight = object.height*level;
  var newPos = new vector( object.pos.x, object.pos.y );
  this.zoom( newPos, boxWidth, boxHeight );
}

map.prototype.follow = function ( object, centered )			///set followed object and if the camera is centered, and/or perform the tracking.
{

    if ( centered != undefined )
      this.centerObj = centered;
    if ( object instanceof element )
      this.followedObj = object;

    else if ( this.followedObj )
    {
      if ( !this.centerObj )//TODO check
      {
	if ( this.followedObj.pos.x - (this.viewBoxWidth/2-this.followedObj.width)/4.0 < this.scroll.x - this.viewBoxWidth/2 )
	  this.scroll.x = this.followedObj.pos.x - (this.viewBoxWidth-this.followedObj.width)/4.0 + this.viewBoxWidth/2;

	if ( this.followedObj.pos.x + this.followedObj.width + (this.viewBoxWidth-this.followedObj.width)/4.0 > this.scroll.x + this.viewBoxWidth/2 )
	  this.scroll.x = this.followedObj.pos.x + this.followedObj.width + (this.viewBoxWidth-this.followedObj.width)/4.0 - this.viewBoxWidth/2;

	if ( this.followedObj.pos.y + this.followedObj.height + (this.viewBoxHeight-this.followedObj.height)/4.0 > this.scroll.y + this.viewBoxHeight/2 )
	  this.scroll.y = this.followedObj.pos.y + this.followedObj.height + (this.viewBoxHeight-this.followedObj.height)/4.0 - this.viewBoxHeight/2;

	if ( this.followedObj.pos.y - (this.viewBoxHeight-this.followedObj.height)/4.0 < this.scroll.y - this.viewBoxHeight/2 )
	  this.scroll.y = this.followedObj.pos.y - (this.viewBoxHeight-this.followedObj.height)/4.0 + this.viewBoxHeight/2;
      }
      else
      {
	if ( this.followedObj.pos.x != this.scroll.x )
	  this.scroll.x = this.followedObj.pos.x;

	if ( this.followedObj.pos.y != this.scroll.y )
	  this.scroll.y = this.followedObj.pos.y;
      }
      this.boundaryCheck();
   }
}