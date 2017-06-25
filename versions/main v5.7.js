//  FIXME
//  =====
//  * overlap/collision=> on simultaneous collisions, maxoverlap is too sometimes too low (investigate),
//  * overlap/collision=> also it gets hanged sometimes even in one-to-one collisions
//
//  TODO
//  ====
//  * animations with sprites + animate to stance
//  * remove all getElementById (make new function)
//  * actions:(go before looking, taking...) ie. append behaviours that are not movements.
//  * behaviours: group behaviours: in line, gather, move in mass to a point, keep formations + efficiency in avoid/detour (only those towards target)
//  * new movements: accelerate to final speed (review soft movements), damped vibrations
//  * include external SVGs - using AJAX
//  * XML configuration file
//  * save game, resize event
//

addEventListener( 'load', init, false );

//GLOBAL PARAMETERS
frameRate = 50;
panSteps = 50;
shiftAngle = 20*Math.PI/180;
defFocusLevel = 10;

  //MOVEMENT
  frictionMoment = 0.1;
  baseSpeed = 2;
  baseAccel = 0.2;
  defFriction = 0;
  defAngAcc = 0.005;

  //TEXT
  textDuration	= 3000;
  answerStyle 	= 'font-size:24px;stroke:black;stroke-width:0.2px;fill:yellow;';
  questionStyle = 'font-size:24px;stroke:black;stroke-width:0.2px;fill:green;';
  txtStyle 	= 'font-size:24px;stroke:black;stroke-width:0.2px;fill:white;';
  lookStyle	= 'font-size:24px;stroke:black;stroke-width:0.2px;fill:yellow;';
  menuRowDistance = 50;	//distance between rows in a menu, etc...
  defChPerLine = 25;	//default characters per line in texts
  defTextLines = 5;	//default lines in each text sequence part

  //HUD
  defItemSize = 40;
  defNumItemsRow = 10;

  //COLLISIONS
  defQTreeMaxDepth = 3;
  defQTreeMaxOcupation = 1;

function init()
{
  svgMain = document.getElementById( 'svgMain' );
  var suspendID = svgMain.suspendRedraw( 5000 );

  ///INITIALIZE FULL SCREEN
  //
  document.documentElement.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );
  document.documentElement.setAttribute( 'width' , window.innerWidth );
  document.documentElement.setAttribute( 'height', window.innerHeight );

  mainTimer = new countDownTimer();
  mainEventDispatcher = new eventDispatcher();
 
  ///LOAD DEFINITIONS
  iconDefs  = new definitions( 'icondefs' );
  itemDefs  = new definitions( 'itemdefs' );
  characterDefs = new definitions( 'characterdefs' );

  elementDefs = [];
  elementDefs[ 'map'   ] = map;
  elementDefs[ 'panel' ] = panel;
  elementDefs[ 'icon'  ] = icon;
  elementDefs[ 'animElement'  ] = animElement;
  elementDefs[ 'item'  ] = item;
  elementDefs[ 'object'] = object;
  elementDefs[ 'being' ] = being;
  elementDefs[ 'character' ] = character;
 
  //Movements
  movementDefs = [];
  movementDefs[ 'rotate' ] = rotation;
  movementDefs[ 'movement' ] = movement;

  actionDefs  = [];
  //Menues
  actionDefs[ 'take' ] = pickItem;
  actionDefs[ 'look' ] = lookItem;
  actionDefs[ 'key'  ] = pickItem;//TODO
  actionDefs[ 'talk' ] = talk;
  //Events
  actionDefs[ 'setAnimation' ] = setAnimation;
  actionDefs[ 'damage' ] = damage;

  ///GLOBAL ELEMENTS
    ///ORGANIZE ELEMENTS IN LISTS - from the document
    frontPanel  = new panel( document.getElementById( 'infopanel' ) );
    scene  = new map( document.getElementById( 'world' ) );
    useList = collectionToArray( document.getElementsByTagName( 'use' ) );

    var allList   = getList();  //get list of all 'use' tags in the document
    objectList = allList.find( object    );
    itemList   = allList.find( item    );
    beingList  = allList.find( being   );
    characterList  = allList.find( character );
 
    selectedList = [];

    collisionTree = new quadTreeNode( objectList.concat( scene.sceneItems )/*.concat( itemList )*/, scene.mapSizeX, scene.mapSizeY  );
    collisionTree.buildTree( /*1, 0*/ );

  loadEvents();

  pausePanel= new text( 'PAUSE' , 'fill:white;font-size:30px' );
  hideElement( pausePanel.SVGNode );

  characterList[0].setSelected( true );
  scene.focus( characterList[0] );
  scene.follow( characterList[0] );

  ///error check
  if ( !scene ) return;

  selectBox = new selectionBox();
  svgMain.setAttribute( 'overflow' , 'visible' );
  //svgMain.setAttribute( 'shape-rendering' , 'optimizeSpeed' );
  //svgMain.setAttribute( 'image-rendering' , 'optimizeSpeed' );
//   svgMain.setAttribute( 'text-rendering' , 'optimizeSpeed' );

  //SET GLOBAL EVENTS
  document.addEventListener( 'keydown',   keyDown, false );
  document.addEventListener( 'mouseup',   mouseUp, false );
  document.addEventListener( 'contextmenu',   function(e){ e.stopPropagation();e.preventDefault(); return false }, false );

  svgMain.unsuspendRedraw( suspendID );

  threadID = setInterval( 'mainLoop()', frameRate );
}

function lockEvent( event )
{
  event.preventDefault();
  event.stopPropagation();
}

f = function(e){ if( e.keyCode != '80' ) lockEvent(e);};      //let only the 'p' button through

function pauseGame()
{
  clearInterval( threadID );
  threadID = undefined;

  //Capture all events in the first phase before bubbling, so they don't reach any element
  document.addEventListener( 'keydown',   f,     true );
  document.addEventListener( 'keyup',   lockEvent, true );
  document.addEventListener( 'mouseup',   lockEvent, true );
  document.addEventListener( 'mousedown',   lockEvent, true );
  document.addEventListener( 'click',   lockEvent, true );
  document.addEventListener( 'DOMMouseScroll',  lockEvent, true );
  document.addEventListener( 'mousemove',   lockEvent, true );

  pausePanel.SVGNode.setAttribute( 'display' , 'block' );
}

function resumeGame()
{
  threadID = setInterval( 'mainLoop()', 50 );

  //unlock events
  document.removeEventListener( 'keydown',    f,     true );
  document.removeEventListener( 'keyup',    lockEvent, true );
  document.removeEventListener( 'mouseup',    lockEvent, true );
  document.removeEventListener( 'mousedown',    lockEvent, true );
  document.removeEventListener( 'click',    lockEvent, true );
  document.removeEventListener( 'DOMMouseScroll', lockEvent, true );
  document.removeEventListener( 'mousemove',    lockEvent, true );

  hideElement( pausePanel.SVGNode ); 
}

function pauseResumeGame()
{
  if ( threadID != undefined )
    pauseGame();
  else
    resumeGame();
}

function getNodeList( attribute, value, tagName ) ///get SVG nodes with that 'attribute' that match 'value', or all if no 'value'. All SVGs if no 'attribute'.
{
  var nodeList = [];
  var SVGlist = [];

  if( tagName )
    SVGlist = document.getElementsByTagName( tagName );
  else
  {
    SVGlist = collectionToArray( document.getElementsByTagName( 'svg' ) );
    var aux = collectionToArray( document.getElementsByTagName( 'use' ) );
    SVGlist = SVGlist.concat( aux );
  }

  if ( value )
  {
    attribute = attribute || 'type';
    for ( var i = 0 ; i < SVGlist.length ; i++ )
    {
      var auxAttr = SVGlist[i].getAttribute( attribute )  ;
      if ( auxAttr && ( !value || auxAttr == value ) )
	nodeList.push( SVGlist[i] );
    }
  }
  else
    nodeList = SVGlist;

  return nodeList;
}

function getList( attribute, value, tagName )  ///Returns list of objects, each one of its correct object type. List contains 'attribute=value', 'attribute'=(any)', or all SVGs.
{
  var list = [];
  var nodeList = getNodeList( attribute, value, tagName );  //gets all SVGs if no attribute, all of kind 'attribute' if no 'value'

  for ( var i = 0 ; i < nodeList.length ; i++ )
  {
    var type = nodeList[i].getAttribute( 'type' );    //an element that is defined in the svg (not in the defs) must hace a 'type' attribute to initialize it 
    if ( type && type != 'map' && type != 'panel' )
      list.push( new elementDefs[ type ]( nodeList[i] ) );
  }

  return list;
}

function getSVGChildById( SVGNode, id )
{
  var node = undefined;
  if (  SVGNode.getAttribute( 'id' ) == id )
    node = SVGNode;
  else
    for ( var child = SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    {
      node = getSVGChildById( child, id );
      if ( node )
	child = null;
    }
  return node;
}

function pathIsValidPolygon( SVGNodePath )  //we assume the polygon is described by a SVG closed <PATH> without arcs or bezier curves
{
  var result = true;
  if ( SVGNodePath.nodeName == 'path' )
  {
    var txtPoints = SVGNodePath.getAttribute( 'd' ).split( ' ' );
    for ( var i = 0 ; i < txtPoints.length ; i++ )
      if ( txtPoints[i] == 's' || txtPoints[i] == 'S' || txtPoints[i] == 'c' || txtPoints[i] == 'C' || txtPoints[i] == 'Q'
	  ||  txtPoints[i] == 'q' || txtPoints[i] == 'T' || txtPoints[i] == 't' ||  txtPoints[i] == 'A' || txtPoints[i] == 'a' ||
	  txtPoints[i] == 'H' ||txtPoints[i] == 'h' || txtPoints[i] == 'V' || txtPoints[i] == 'v' )
	result = false;
  }
  return result;
}

function pointsFromPath( SVGNodePath )
{
  var points = [];
  if ( SVGNodePath.nodeName == 'path' )
  {
    var txtPoints = SVGNodePath.getAttribute( 'd' ).split( ' ' );
    var firstPt = txtPoints[1].split( ',' );      //the first point is the absolute position, all the others are relative to this one
    points[0] = new vector( parseFloat( firstPt[0] ) , parseFloat( firstPt[1] ) );

    //INCREMENTAL OR ABSOLUTE MODE
    if ( txtPoints[0] == 'm' )  //incremental mode
      var a = 1;
    else // 'M' absolute mode
      var a = 0;

    for ( var i = 2 ; i < txtPoints.length - 2 ; i++ )    //get rid of the 'm' and the 'z', don't count the first, or the last one that closes (= to the first)
    {
      if ( txtPoints[i] == 'l' ) //incremental mode
	a = 1;
      else if ( txtPoints[i] == 'L' ) //absolute mode
	a = 0;
      else if ( txtPoints[i] == 'c' || txtPoints[i] == 's' )
      {
	alert( "Warning:curve found in polygon, stopping further reading" );
	return points;
      }
      else
      {
	var aux = txtPoints[i].split( ',' );
	points.push ( new vector( parseFloat( aux[0] ) + a*points[points.length-1].x , parseFloat( aux[1] ) + a*points[points.length-1].y ) );
      }
    }
  }
  return points;
}

Array.prototype.find = function ( class, type )
{
  var returnList = [];
  for ( var i = 0 ; i < this.length ; i++ )
    if ( ( !class || this[i] instanceof class ) && ( !type || this[i].type == type ) )
      returnList.push( this[i] );
  return returnList;
}

Array.prototype.findOnly = function ( class, type )
{
  var returnList = [];
  for ( var i = 0 ; i < this.length ; i++ )
    if ( ( !class || this[i].constructor == class ) && ( !type || this[i].type == type ) )
      returnList.push( this[i] );
  return returnList;
}

Array.prototype.removeElement = function ( element )
{
  for ( var i = 0 ; i < this.length ; i++ )
    if ( this[i] === element )
    {
      this.splice( i, 1 );
      i = this.length;
    }
}

function collectionToArray( collection )
{
  var ary = [];
  for( var i = 0 ; i < collection.length ; i++ )
    ary.push( collection[i] );
  return ary;
}

//////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

function mainLoop()
{
  var suspendID = svgMain.suspendRedraw( 5000 );

  mainEventDispatcher.checkEvents();
  doElemEvents();
  doMovements();
  doCollisions();
  doBehaviourss();
  doAnimations();
  doDrawing();
  scene.pan();
  scene.zoom();
  mainTimer.count();

  svgMain.unsuspendRedraw( suspendID );
}

function countDownTimer()		//prototype to syncronize time countdowns with the main timer
{
  this.countDowns = [];
}

countDownTimer.prototype.getUniqueId = function()
{
  var maxId = 0;
  for ( var i = 0 ; i < this.countDowns.length ; i++ )
    if ( this.countDowns[i].id >= maxId )
      maxId = this.countDowns[i].id + 1;
  return maxId;
}

countDownTimer.prototype.addCountDown = function( fn, timeout, loop )	//TODO use string as id
{
  loop = loop || false;
  var id = this.getUniqueId();
  var numCounts = Math.ceil( timeout/frameRate );
  
  this.countDowns.push( { id:id , count:numCounts, duration:numCounts , func:fn, loop:loop } );
 
  return id;
}

countDownTimer.prototype.count = function( id )		//countdown and execute for one or all the counters
{
  if ( id )		//DO ONE
  {
    for ( var i = 0 ; i < this.countDowns.length ; i++ )
      if ( this.countDowns[ i ].id == id )
      {
	if ( this.countDowns[i].count > 0 )
	  this.countDowns[i].count--;
	else
	{
	  this.countDowns[i].func();		//do the action at the end of the countdown
	  if ( this.countDowns[i].loop )
	    this.countDowns[i].count = this.countDowns[i].duration;//start over
	  else
	    this.countDowns.splice( i , 1 );	//remove the countdown
	}
	i = this.countDowns.length;
      }
  }
  else			//DO ALL
    for ( var i = 0 ; i < this.countDowns.length ; i++ )
      if ( this.countDowns[i].count > 0 )
	this.countDowns[i].count--;
      else
      {
	this.countDowns[i].func();		//do the action at the end of the countdown
	if ( this.countDowns[i] && this.countDowns[i].loop )
	  this.countDowns[i].count = this.countDowns[i].duration;//start over
	else
	  this.countDowns.splice( i , 1 );	//remove the countdown
      }
}

countDownTimer.prototype.resetCount = function( timerID, newDuration )
{
  for( var i = 0 ; i < this.countDowns.length ; i++ )
    if ( this.countDowns[i].id == timerID )
      if ( newDuration )
      {
	var numCounts = Math.ceil( newDuration/frameRate );
	this.countDowns[i].duration = numCounts;
	this.countDowns[i].count = numCounts;
      }
      else
	this.countDowns[i].count = this.countDowns[i].duration;
}

countDownTimer.prototype.removeCount = function( id )
{
  if ( id != undefined )
    for ( var i = 0 ; i < this.countDowns.length ; i++ )
      if ( this.countDowns[i].id == id )
      {
	this.countDowns.splice( i , 1 );
	i = this.countDowns.length;
      }
}

function loadEvents( defNodeName ) //extract events from the document. the actions are predefined in 'actiondefs'
{
  var node = document.getElementById( defNodeName || 'eventdefs' );
  for ( var child = node.firstElementChild ; child != null ; child = child.nextElementSibling )
    mainEventDispatcher.addEventListener( new eventListener( child.getAttribute( 'type' ), 
							    actionDefs[ child.getAttribute( 'action' ) ],
							    child.getAttribute( 'condition' ),
							    child.getAttribute( 'oneUse' ) == 'yes' ) );
}

function event( typeStr, conditionStr )	//event of a certain type. Arbitrary additional arguments can be passed in.
{					//events are fired from certain actions, or by functions that watch status
  this.type = typeStr;		//the event will be handled by an eventListener of the same type
  this.conditionStr = conditionStr;
  this.args = [];		//extra parameters for the handler to execute the action

  //ConditionStr: For a value, it will be of the type '<0' or '!=100', and will be evaluated ,whilst for a 
  //string it will just be a string that needs to coincide for the event to be executed.
  for ( var i = 2 ; i < arguments.length ; i++ )
    this.args.push( arguments[i] );
}

function eventListener( type, action, conditionStr, oneUse )
{
  this.type = type;
  this.action = action;			//receives the event as its only parameter.
  this.oneUse = oneUse || false;
  this.condition = undefined;

  if ( conditionStr )
  {
    var match = conditionStr.match( /(<|>|!=|==)(.*)/ );
    if ( match )
    {
      var op =  match[1];
      var value = match[2];
      if ( op == '<' )
	this.condition = function( event ){ return event.conditionStr < value };
      else if ( op == '>' )
	this.condition = function( event ){ return event.conditionStr > value };
      else if ( op == '!=' )
	this.condition = function( event ){ return event.conditionStr != value };
      else if ( op == '==' )
	this.condition = function( event ){ return event.conditionStr == value };
    }
    else
      this.condition = function( event ){ return event.conditionStr == undefined ? true : 
	event.conditionStr == conditionStr };
  }
}

function eventDispatcher()		//mechanism to make changes in the game, where events are sent to and handlers are published.
{
  this.events = [];		//Event queue, to be processed next
  this.eventListeners = [];	//Listeners that are published and waiting for events
}

eventDispatcher.prototype.checkEvents = function ()	//Process all events that need to be handled
{
  for ( var i = 0 ; i < this.events.length ; i++ )
  {
    for ( var j = 0 ; j < this.eventListeners.length ; j++ )	//one event can fire many handlers
      if ( this.events[i].type == this.eventListeners[j].type && this.eventListeners[j].action
	  && ( this.eventListeners[j].condition && this.eventListeners[j].condition( this.events[i] )
	      || !this.eventListeners[j].condition ) )
      {
	this.eventListeners[j].action( this.events[i] );	//DO THE EVENT
	if ( this.eventListeners[j].oneUse )
	  this.eventListeners.splice( j--, 1 );
      }
    this.events.splice( i--, 1 );		//remove it, has it been processed or not
  }
}

eventDispatcher.prototype.addEvent = function ( ev )
{
  this.events.push( ev );
}

eventDispatcher.prototype.addEventListener = function ( evl )
{
  this.eventListeners.push( evl );
}

function doMovements( objList )   // Move the objects in the list. Move all if no list
{
  objList = objList || objectList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].move();
}

function doDrawing( objList )
{
  objList = objList || objectList;
  for ( var i = 0 ; i < objList.length ; i++ )
  {
    if ( objList[i].movementList[0] )
      objList[i].setPosition();
    if ( objList[i].rotation )
      objList[i].setRotation();
  }
}

function doAnimations( objList )    // Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
  objList = objList || beingList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].animate();
}

function doElemEvents( objList )
{
  objList = objList || itemList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].evDispatcher.checkEvents();
}


function doBehaviourss( objList )   // Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
  objList = objList || beingList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].doBehaviours();
}

/*function doCollisions( colTree )
{
  // doDrawing();//TODO
  colTree = colTree || collisionTree;
  colTree.update();
  var node = colTree.firstLeaf();

  var collisionInfo = undefined;    //object that contains all the information about the collision
  var maxOverlap = 0;

  //A) DETECT OVERLAP
  while( node != undefined )
  {
    for ( var i = 0 ; i < node.elements.length ; i++ )
      for ( var j = i+1 ; j < node.elements.length ; j++ )
	if ( ( ( node.elements[i].movementList && node.elements[i].movementList[0] ) || node.elements[i].rotation //check that at least one is moving or rotating
	      || ( node.elements[j].movementList && node.elements[j].movementList[0] ) || node.elements[j].rotation )
	    && overlapPoints( node.elements[i], node.elements[j] ) )//preliminary check for fast computing: see if the outer bounding boxes overlap before exact detection
	  for ( var k = 0 ; k < node.elements[i].parts.length ; k++ )
	    for ( var l = 0 ; l < node.elements[j].parts.length ; l++ )
	    {
	      //OVERLAP CHECK
	      var colPts = overlapPoints( node.elements[i].parts[k] , node.elements[j].parts[l] );
	      if ( colPts )
	      {
		//MEASURE OVERLAP TIME, AND LOOK FOR THE MAXIMUM OVERLAP FOR ALL OBJECTS AND PARTS (ie. the first collision)
		var overlapInfo = calculateOverlap( node.elements[i].parts[k], node.elements[j].parts[l], colPts[0], colPts[1] );
		if ( overlapInfo.overlapFraction > maxOverlap )
		{
		  maxOverlap = overlapInfo.overlapFraction;
		  //Choose the inner object to decide the normal (only important for polygon sharp corners)
		  if( colPts[0].length >= colPts[1].length )
		    collisionInfo = { 'colPt':overlapInfo.colPt , 'overlapFraction':overlapInfo.overlapFraction  ,
		      'inObj': node.elements[i] , 'outObj':node.elements[j] , 'inPart': node.elements[i].parts[k] };
		  else
		    collisionInfo = { 'colPt':overlapInfo.colPt , 'overlapFraction':overlapInfo.overlapFraction  ,
		      'inObj': node.elements[j] , 'outObj':node.elements[i] , 'inPart': node.elements[j].parts[l] };
		}
	      }
	    }
    node = node.nextLeaf();
  }

  //B) CORRECT AND SOLVE OVERLAP
  if ( collisionInfo )
  {
    //B1) CORRECT OVERLAP
    for ( var n = 0 ; n < colTree.elements.length ; n++ ) //Rewind all objects' movements to the point of the first collision
      if ( colTree.elements[n] instanceof object )
      {
	if ( colTree.elements[n].movementList[0] )
	{
	  colTree.elements[n].pos =  colTree.elements[n].pos.minus( colTree.elements[n].velocity().multiply( collisionInfo.overlapFraction ) );
	  //    colTree.elements[n].setPosition();
	}
	if ( colTree.elements[n].rotation )
	{
	  colTree.elements[n].rotate ( -colTree.elements[n].angVelocity() * collisionInfo.overlapFraction );
	  //    colTree.elements[n].setRotation();
	}
      }
    //B2) SOLVE THE (first) COLLISION
        var trig1 = collisionInfo.inObj.collisionTrigger( collisionInfo.outObj, collisionInfo );
        var trig2 = collisionInfo.outObj.collisionTrigger( collisionInfo.inObj, collisionInfo );
        if ( trig1 && trig2  )  //if one trigger returns false, the elastic colision is cancelled
          elasticImpact( collisionInfo.inObj, collisionInfo.outObj, collisionInfo.inPart.getShape().getNormal( collisionInfo.colPt ), collisionInfo.colPt );

    //B3) CONTINUE THE REST OF THE MOVEMENT FOR THIS FRAME INTERVAL
    for ( var n = 0 ; n < colTree.elements.length ; n++ )
      if ( colTree.elements[n] instanceof object )
      {
	if ( colTree.elements[n].movementList[0] )
	{
	  colTree.elements[n].pos =  colTree.elements[n].pos.add( colTree.elements[n].velocity().multiply( collisionInfo.overlapFraction ) );
	  //    colTree.elements[n].setPosition();
	}
	if ( colTree.elements[n].rotation )
	{
	  colTree.elements[n].rotate ( colTree.elements[n].angVelocity() * collisionInfo.overlapFraction );
	  //colTree.elements[n].setRotation();
	}
      }
    //B4) CHECK AGAIN for new collisions during the rest of the frame interval
    doCollisions();
  }
}*/

function doCollisions( colTree )
{
  // doDrawing();//TODO
  colTree = colTree || collisionTree;
  colTree.update();
  var node = colTree.firstLeaf();

  var collisionInfo = undefined;    //object that contains all the information about the collision
  var maxOverlap = 0;

  //A) DETECT OVERLAP
  while( node != undefined )
  {
    for ( var i = 0 ; i < node.elements.length ; i++ )
      for ( var j = i+1 ; j < node.elements.length ; j++ )
	if ( ( ( node.elements[i].movementList && node.elements[i].movementList[0] ) || node.elements[i].rotation //check that at least one is moving or rotating
	      || ( node.elements[j].movementList && node.elements[j].movementList[0] ) || node.elements[j].rotation )
	    && overlapPoints( node.elements[i], node.elements[j] ) )//preliminary check for fast computing: see if the outer bounding boxes overlap before exact detection
	  for ( var k = 0 ; k < node.elements[i].parts.length ; k++ )
	    for ( var l = 0 ; l < node.elements[j].parts.length ; l++ )
	    {
	      //OVERLAP CHECK
	      var colPts = overlapPoints( node.elements[i].parts[k] , node.elements[j].parts[l] );
	      if ( colPts )
	      {
		//MEASURE OVERLAP TIME, AND LOOK FOR THE MAXIMUM OVERLAP FOR ALL OBJECTS AND PARTS (ie. the first collision)
		var overlapInfo = calculateOverlap( node.elements[i].parts[k], node.elements[j].parts[l], colPts[0], colPts[1] );
		if ( overlapInfo.overlapFraction > maxOverlap )
		{
		  maxOverlap = overlapInfo.overlapFraction;
		  //Choose the inner object to decide the normal (only important for polygon sharp corners)
		  if( colPts[0].length >= colPts[1].length )
		    collisionInfo = { 'colPt':overlapInfo.colPt , 'overlapFraction':overlapInfo.overlapFraction  ,
		      'inObj': node.elements[i] , 'outObj':node.elements[j] , 'inPart': node.elements[i].parts[k] };
		  else
		    collisionInfo = { 'colPt':overlapInfo.colPt , 'overlapFraction':overlapInfo.overlapFraction  ,
		      'inObj': node.elements[j] , 'outObj':node.elements[i] , 'inPart': node.elements[j].parts[l] };
		}
	      }
	    }
    node = node.nextLeaf();
  }

  //B) CORRECT AND SOLVE OVERLAP
  if ( collisionInfo && collisionInfo.inObj.collisionRule != 'ignore' && collisionInfo.outObj.collisionRule != 'ignore' )
  {
    //B1) CORRECT OVERLAP
    for ( var n = 0 ; n < colTree.elements.length ; n++ ) //Rewind all objects' movements to the point of the first collision
      if ( colTree.elements[n] instanceof object )
      {
	if ( colTree.elements[n].movementList[0] )
	{
	  colTree.elements[n].pos =  colTree.elements[n].pos.minus( colTree.elements[n].velocity().multiply( collisionInfo.overlapFraction ) );
	  //    colTree.elements[n].setPosition();
	}
	if ( colTree.elements[n].rotation )
	{
	  colTree.elements[n].rotate ( -colTree.elements[n].angVelocity() * collisionInfo.overlapFraction );
	  //    colTree.elements[n].setRotation();
	}
      }
    //B2) SOLVE THE (first) COLLISION
    changeMovementsOnCollision( collisionInfo );//change movements depending on settings
    mainEventDispatcher.addEvent( new event( 'collision', undefined, collisionInfo ) );

    //B3) CONTINUE THE REST OF THE MOVEMENT FOR THIS FRAME INTERVAL
    for ( var n = 0 ; n < colTree.elements.length ; n++ )
      if ( colTree.elements[n] instanceof object )
      {
	if ( colTree.elements[n].movementList[0] )
	{
	  colTree.elements[n].pos =  colTree.elements[n].pos.add( colTree.elements[n].velocity().multiply( collisionInfo.overlapFraction ) );
	  //    colTree.elements[n].setPosition();
	}
	if ( colTree.elements[n].rotation )
	{
	  colTree.elements[n].rotate ( colTree.elements[n].angVelocity() * collisionInfo.overlapFraction );
	  //colTree.elements[n].setRotation();
	}
      }
    //B4) CHECK AGAIN for new collisions during the rest of the frame interval
    doCollisions();
  }
}

function changeMovementsOnCollision( collisionInfo )//decide the reaction to a collision
{
  //precedence is 'ignore' > 'rigid' > 'elastic' (default). If at least one ignores or is rigid the others are overriden
  if ( collisionInfo.inObj.collisionRule != 'ignore' && collisionInfo.outObj.collisionRule != 'ignore' )
    if ( collisionInfo.inObj.collisionRule == 'rigid' || collisionInfo.outObj.collisionRule == 'rigid' )
    {
      collisionInfo.inObj.stopInstant();
      collisionInfo.outObj.stopInstant();
    }
    else
      elasticImpact( collisionInfo.inObj, collisionInfo.outObj, collisionInfo.inPart.getShape().getNormal( collisionInfo.colPt ), collisionInfo.colPt );
}

function quadTreeNode ( objList, mapWidth, mapHeight, parentNode, coordinate , x, y, depth, maxDepth, maxOcupation )
{
  //STRUCTURE
  this.elements = objList.slice();
  this.parentNode = parentNode;
  this.coordinate = coordinate;
  this.childNodes = [];

  //SPLITTING POLICY
  this.maxDepth = maxDepth || defQTreeMaxDepth;        //4^3 = 64 subdivisions
  this.maxOcupation = maxOcupation || defQTreeMaxOcupation;

  //STATE INFORMATION
  this.depth = depth || 0;
  this.x = x || 0;
  this.y = y || 0;
  this.mapWidth = mapWidth;
  this.mapHeight = mapHeight;
}

quadTreeNode.prototype.firstLeaf = function()       //returns a pointer to the first leaf node in the subtree
{
  var node = this;
  while ( node.childNodes.length > 0 )
    node = node.childNodes[0];
  return node;
}

quadTreeNode.prototype.nextLeaf = function()        //returns a pointer to the next leaf node in the subtree ('undefined' if this was the last)
{
  if ( this.coordinate < 3 )
    return this.parentNode.childNodes[ this.coordinate + 1 ];
  else if ( this.coordinate == 3 )
  {
    var node = this.parentNode.nextLeaf();
    if ( node != undefined )    //if parent is the root node, then we are finished
      return node.firstLeaf();
  }
  return undefined;     //in case we are in the root node there is no 'next leaf'
}

quadTreeNode.prototype.corresponds = function( element )
{
  return ( ( ( element.pos.x + element.BBox.width/2 <= this.x + this.mapWidth && element.pos.x + element.BBox.width/2 >= this.x )
  || ( element.pos.x - element.BBox.width/2 <= this.x + this.mapWidth  && element.pos.x - element.BBox.width/2 >= this.x ) )
      && ( ( element.pos.y + element.BBox.height/2 <= this.y + this.mapHeight && element.pos.y + element.BBox.height/2 >= this.y )
  || ( element.pos.y - element.BBox.height/2 <= this.y + this.mapHeight && element.pos.y - element.BBox.height/2 >= this.y ) ) );
}

quadTreeNode.prototype.split = function()     //divide the node in four quadrants and populate them with the according elements
{
  this.childNodes = [];
  var qTable = [];
  qTable[0] = [];   //first quadrant: TOP LEFT
  qTable[1] = [];   //second quadrant: TOP RIGHT
  qTable[2] = [];   //third quadrant: BOTTOM LEFT
  qTable[3] = [];   //fourth quadrant: BOTTOM RIGHT

  //make a list for each quadrant
  for ( var i = 0 ; i < this.elements.length ; i++ )
  {
    if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 < this.x + this.mapWidth/2
  || this.elements[i].pos.x - this.elements[i].BBox.width/2 < this.x + this.mapWidth/2 )
      && ( this.elements[i].pos.y + this.elements[i].BBox.height/2 < this.y + this.mapHeight/2
  || this.elements[i].pos.y - this.elements[i].BBox.height/2 < this.y + this.mapHeight/2 ) )
      qTable[0].push( this.elements[i] );

    if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2
  || this.elements[i].pos.x - this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2 )
      && ( this.elements[i].pos.y + this.elements[i].BBox.height/2 < this.y + this.mapHeight/2
  || this.elements[i].pos.y - this.elements[i].BBox.height/2 < this.y + this.mapHeight/2 ) )
      qTable[1].push( this.elements[i] );

    if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 < this.x + this.mapWidth/2
  || this.elements[i].pos.x - this.elements[i].BBox.width/2 < this.x + this.mapWidth/2 )
      && ( this.elements[i].pos.y + this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2
  || this.elements[i].pos.y - this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2 ) )
      qTable[2].push( this.elements[i] );

    if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2
  || this.elements[i].pos.x - this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2 )
      && ( this.elements[i].pos.y + this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2
  || this.elements[i].pos.y - this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2 ) )
      qTable[3].push( this.elements[i] );
  }
  //make the new 'leaf' nodes
  this.childNodes[0] = new quadTreeNode( qTable[0] , this.mapWidth/2, this.mapHeight/2, this , 0 , this.x, this.y, this.depth + 1, this.maxDepth, this.maxOcupation );
  this.childNodes[1] = new quadTreeNode( qTable[1] , this.mapWidth/2, this.mapHeight/2, this , 1 , this.x + this.mapWidth/2, this.y, this.depth + 1, this.maxDepth, this.maxOcupation );
  this.childNodes[2] = new quadTreeNode( qTable[2] , this.mapWidth/2, this.mapHeight/2, this , 2 , this.x, this.y + this.mapHeight/2, this.depth + 1, this.maxDepth, this.maxOcupation );
  this.childNodes[3] = new quadTreeNode( qTable[3] , this.mapWidth/2, this.mapHeight/2, this , 3 , this.x + this.mapWidth/2, this.y + this.mapHeight/2, this.depth + 1, this.maxDepth, this.maxOcupation );
}

quadTreeNode.prototype.buildTree = function( maxOcupation, maxDepth )
{
  this.maxOcupation = maxOcupation || this.maxOcupation;
  if ( maxDepth != undefined )
    this.maxDepth = maxDepth;
  if ( this.elements.length > this.maxOcupation && this.depth < this.maxDepth )   //conditions to continue division
  {
    this.split();                 //subdivide into four new quadrants
    for ( var i = 0 ; i < 4 ; i++ )             //build tree on each one of them
      this.childNodes[i].buildTree( maxOcupation, maxDepth );
  }
}

quadTreeNode.prototype.insertElement = function( element )//insert the element in a node and update its subtree, if appropriate. (This doesn't update parent nodes)
{
  if ( this.corresponds( element ) )
  {
    this.elements.push( element );
    if ( this.childNodes.length > 0 )   //non-leaf node: place in the corresponding childen node(s) recursively
      for ( var i = 0 ; i < this.childNodes.length ; i++ )
  this.childNodes[i].insertElement( element );
    else          //leaf node: check if further splitting is necessary
      this.buildTree();
  }
}

quadTreeNode.prototype.removeElement = function( element )  //remove the element from a node and all its subtree
{
  if ( this.corresponds( element ) )
    for ( var j = 0 ; j < this.elements.length ; j++ )
      if ( element === this.elements[j] )
      {
  this.elements.splice( j, 1 );       //remove it
  if ( this.elements.length <= this.maxOcupation )  //check if its leafs should be merged
    this.childNodes = [];
  for ( var i = 0 ; i < this.childNodes.length ; i++ )  //otherwise, continue removing further down
    this.childNodes[i].removeElement( element );
  j = this.elements.length;     //finish (assume no duplicated elements)
      }
}

quadTreeNode.prototype.update = function( objList )
{
  objList = objList || objectList;
  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i].movementList[0] )
    {
      this.removeElement( objList[i] );
      this.insertElement( objList[i] );
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function overlapPoints ( obj1, obj2 ) //return the collection of intersecting points for each object, or 'undefined'
{
  var result = undefined;

  if ( obj1 && obj2 && obj1 !== obj2 )
  {
    if ( obj1 instanceof rectangle )  //to be used with bounding boxes, for simplicity
      var obj1Shape = obj1;
    else
      var obj1Shape = obj1.getShape();
    if ( obj2 instanceof rectangle )  //to be used with bounding boxes, for simplicity
      var obj2Shape = obj2;
    else
      var obj2Shape = obj2.getShape();

    var colPts1 = obj1Shape.ptsInside( obj2Shape );
    var colPts2 = obj2Shape.ptsInside( obj1Shape );

    if ( colPts1.length > 0 || colPts2.length > 0 )
      result = [ colPts1 , colPts2 ];
  }
    return result;
}

function calculateOverlap ( obj1, obj2, obj1Pts, obj2Pts )  //moves the two objects to correct overlapping
{
  var result = undefined;
  if ( obj1 !== obj2 )
  {
    if ( ( !obj2Pts && !obj1Pts ) || ( obj2Pts.length == 0 && obj1Pts.length == 0 ) )
    {
      var points = obj1.overlapPoints( obj2 );
      if ( points )
      {
  obj1Pts = points[0];
  obj2Pts = points[1];
      }
    }
      //LOOK FOR THE DEEPEST POINT
      var deepestDist = 0;
      for ( var i = 0 ; i < obj1Pts.length ; i++ )
      {
  var velP1 = obj1.pointVelocity( obj1Pts[i] );
  var velP2 = obj2.pointVelocity( obj1Pts[i] );

  //Total collision velocity
  var totalVel = obj2.velocity().add( velP2 ).minus( obj1.velocity() ).minus( velP1 );//velocity relative to 'obj1'

  var overlap = obj1.getShape().overlapDistance( obj1Pts[i], totalVel );
  var dist = overlap.sqModulus();
  if (  dist > deepestDist )
  {
    deepestDist = dist;

    var inObj = obj1;
    var outObj = obj2;
    var colPt = obj1Pts[i];
    var maxOverlap = overlap;     //relative to 'inObj' (outwards from 'inObj')
    var colVel = totalVel;      //relative to 'inObj'
  }
      }
      for ( var i = 0 ; i < obj2Pts.length ; i++ )
      {
  var velP1 = obj1.pointVelocity( obj2Pts[i] );
  var velP2 = obj2.pointVelocity( obj2Pts[i] );

  //Total collision velocity
  var totalVel = obj2.velocity().add( velP2 ).minus( obj1.velocity() ).minus( velP1 );  //velocity relative to 'obj1'

  var overlap = obj2.getShape().overlapDistance( obj2Pts[i], totalVel.multiply(-1) );
  var dist = overlap.sqModulus();
  if (  dist > deepestDist )
  {
    deepestDist = dist;

    var inObj = obj2;
    var outObj = obj1;
    var colPt = obj2Pts[i];
    var maxOverlap = overlap;     //relative to 'inObj' (outwards from 'inObj')
    var colVel = totalVel;
  }
      }

      //PARAMETERS TO CORRECT OVERLAP
      var colSpd = colVel.modulus();
      var dist   = maxOverlap.modulus();

      if ( colSpd != 0 )
      {
  var overlapFraction = dist/colSpd;  //represents how much we 'rewind' the movement, to the original place of collision with no overlap.

  overlapFraction = parseFloat( ( overlapFraction + 0.00001 ).toFixed( 5 ) ); //round error correction to assure no further overlapping

  var correct1 = inObj.velocity().multiply( overlapFraction );
  var correct2 = outObj.velocity().multiply( overlapFraction );
      }
      else
      {
  var overlapFraction = 0;
  var correct1 = maxOverlap.multiply( 1/2 );
  var correct2 = maxOverlap.multiply( -1/2 );
      }

      var colPt = colPt.minus( correct2.add( outObj.pointVelocity( colPt, -outObj.angVelocity() * overlapFraction ) ) );

      result = { 'colPt':colPt , 'overlapFraction':overlapFraction };
  }
  return result;    //return the collision point and the rewind fraction, or 'undefined'
}

function elasticImpact ( obj1, obj2, dirN, point )  //solve impact according to surfaces, or with a wall with normal 'normalDir'
{
    // EXTRACT PARAMETERS
    var vel1  = ( obj1.velocity == undefined ) ? new vector( 0 , 0 ) : obj1.velocity();
    var vel2  = ( obj2.velocity == undefined ) ? new vector( 0 , 0 ) : obj2.velocity();
    var w1  = ( obj1.angVelocity == undefined ) ? 0 : obj1.angVelocity();
    var w2  = ( obj2.angVelocity == undefined ) ? 0 : obj2.angVelocity();
    var m1   = obj1.mass || Infinity;
    var m2   = obj2.mass || Infinity;
    var moi1 = obj1.momInertia || Infinity;
    var moi2 = obj2.momInertia || Infinity;

    var dirN = dirN || obj1.pos.minus( obj2.pos );

    ///CHANGE AXES: extract the velocity in the axis parallel and normal to the collision
    var newAxes = new axes( dirN );
    var projVel1 = newAxes.project( vel1 );
    var projVel2 = newAxes.project( vel2 );

    //CALCULATE THE MOMENT ARM
    var d1 = point.minus( obj1.pos );
    var d2 = point.minus(  obj2.pos );
    var ang1 = d1.angle( dirN.multiply(-1) );//the impulse is defined inwards to 'obj1' obj2ect
    var ang2 = d2.angle( dirN.multiply(-1) );
    var a1 = d1.modulus()*Math.sin( ang1 );
    var a2 = d2.modulus()*Math.sin( ang2 );

    //A) CALCULATE THE IMPULSE: to get exchange of angular and linear velocities between obj2ects. Defined inwards to 'obj1' obj2ect
    //formula based in B) and in conservation of energy
    var j = -2*( projVel1.x - projVel2.x - w1*a1 + w2*a2 )/( 1/m1 + 1/m2 + a1*a1/moi1 + a2*a2/moi2 );

    //B) CALCULATE NEW VELOCITIES AND SPINS FROM IMPULSE
    var v1f = projVel1.x + j/m1;
    var v2f = projVel2.x - j/m2;
    var w1f = w1 - j*a1/moi1;
    var w2f = w2 + j*a2/moi2;

    //DETERMINE NEW VELOCITIES AND ROTATIONS IN THE ORIGINAL AXES
    if ( j != 0 )
    {
      var auxVel1 = new vector( v1f , projVel1.y );
      var auxVel2 = new vector( v2f , projVel2.y );

      var newVel1 = newAxes.unproject( auxVel1 );
      var newVel2 = newAxes.unproject( auxVel2 );

      if ( obj1 instanceof object )
      {
  obj1.replaceMovement ( new movement( obj1, newVel1.direction(), newVel1.modulus(), baseAccel*4, false ) );
  obj1.doMovAction();
  if ( obj1 instanceof being )
    obj1.keyboardControlOrders();
  if ( w1f != 0 )
    obj1.rotation = new rotation( w1f , undefined, frictionMoment );
  else
    obj1.rotation = undefined;
      }

      if ( obj2 instanceof object )
      {
  obj2.replaceMovement ( new movement( obj2, newVel2.direction(), newVel2.modulus(), baseAccel*4, false ) );
  obj2.doMovAction();
  if ( obj2 instanceof being )
    obj2.keyboardControlOrders();
  if ( w2f != 0 )
    obj2.rotation = new rotation( w2f , undefined, frictionMoment );
  else
    obj2.rotation = undefined;
      }
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    scalar = ( scalar == undefined ) ? 1 : scalar;
    returnPoint.x *= scalar;
    returnPoint.y *= scalar;
    return returnPoint;
}

vector.prototype.modulus = function ()
{
    return Math.sqrt( this.x*this.x + this.y*this.y );
}

vector.prototype.sqModulus = function ()  //useful for certain distance comparisons, to speed up
{
    return this.x*this.x + this.y*this.y;
}


vector.prototype.direction = function ()
{
    return this.multiply( 1/this.modulus() );
}

vector.prototype.angle = function( vec )    //returns the angle with X axis, or with vector, defined between [-PI, +PI)
{
    if ( vec instanceof vector )
      var value = angleCheck( vec.angle() - this.angle() );
    else
    {
      if ( this.x < 0 )
  var shift = Math.PI;
      else
  var shift = 0;
      var value = ( shift + Math.atan( this.y/this.x ) );   //values between [-PI/2, 3*PI/2)

      if ( value >= Math.PI )         //correct the range [PI, 3*PI/2)
  value -= 2*Math.PI;
    }
    return value;
}

vector.prototype.angle2 = function( vec )   //returns the angle with X axis, or with vector, defined between [0, +2PI)
{
  if ( vec instanceof vector )
    var value = angleCheck2( vec.angle() - this.angle() );
  else
  {
    if ( this.x < 0 )
      var shift = Math.PI;
    else
      var shift = 0;
    var value = ( shift + Math.atan( this.y/this.x ) );   //values between [-PI/2, 3*PI/2)

    if ( value < 0 )          //correct the range [-PI/2, 0)
      value += 2*Math.PI;
  }
  return value;
}

function angleCheck( ang )          //makes sure an angle is expressed between [-PI, +PI)
{
  ang = ang % (2*Math.PI);          //values between [-2*PI/2, +2*PI)
  if ( ang < -Math.PI )         //correct the range [-PI, -2*PI)
    ang += 2*Math.PI;
  if ( ang > Math.PI )            //correct the range [+PI, +2*PI)
    ang -= 2*Math.PI;
  return ang;
}

function angleCheck2( ang )         //makes sure an angle is expressed between [0,2PI)
{
  ang = ang % (2*Math.PI);          //values between [-2*PI/2, +2*PI)
  if ( ang < 0 )          //correct the range [-2PI, 0)
    ang += 2*Math.PI;
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
  angle = ( angle == undefined ) ? shiftAngle : angle;
  if ( angle != 0 )
  {
    var sinA = Math.sin( angle );
    var cosA = Math.cos( angle );
    var x = this.x*cosA - this.y*sinA ;
    var y = this.x*sinA + this.y*cosA ;
    this.x = x;
    this.y = y;
  }
  return this;
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

function avgVector( vectorList )
{
    var result = new vector( vectorList[0] );
    if ( vectorList.length > 1 )
    {
      for ( var i = 1 ; i < vectorList.length ; i++ )
  result = result.add( vectorList[i] );
      result = result.multiply( 1/vectorList.length );
    }
  return result;
}

function leftMostX ( points )
{
  var result = Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].x < result )
  result = points[i].x;
  }
  else if ( points instanceof vector )
    result = point.x;

  return result;
}

function rightMostX ( points )
{
  var result = -Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].x > result )
  result = points[i].x;
  }
  else if ( points instanceof vector )
    result = point.x

  return result;
}

function downMostY ( points )
{
  var result = -Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].y > result )
  result = points[i].y;
  }
  else if ( points instanceof vector )
    result = point.y;

  return result;
}

function upMostY ( points )
{
  var result = Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].y < result )
  result = points[i].y;
  }
  else if ( points instanceof vector )
    result = point.y;

  return result;
}

function axes( dirX, dirY, center ) //define new axes ( or XY axis without parameters ). Only needs the direction of one axis
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

axes.prototype.project = function( vec, isFree )  //rotate vectors to work in the new axes
{
  if ( vec instanceof vector )
  {
    if ( isFree == false )        //consider 'vec' as a free vector or as a fixed vector
      vec = vec.minus( this.center );
    return new vector( vec.project( this.dirX ) , vec.project( this.dirY ) );
  }
}

axes.prototype.unproject = function( vec, isFree )  //rotate the result back to the original XY axes, assuming perpendicular axes
{
  if ( vec instanceof vector )
  {
    var result = new vector( vec.project( this.dirX.x, -this.dirX.y ) , vec.project( this.dirX.y, this.dirX.x ) );
    if ( isFree == false )        //consider 'vec' as a free vector or as a fixed vector
      result = result.add( this.center );
    return result;
  }
}

axes.prototype.rotate = function( ang )   //only the directions, does not affect the center
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

rectangle.prototype.samplePoints =  function( )   // creates a list of points inside the surface, in the coordinates of the center of the rectangle
{
  var points = [];
  points.push( new vector( this.width/2 , this.height/2 ) );    //inferior right corner
  points.push( new vector( -this.width/2 , this.height/2 ) );   //inferior left corner
  points.push( new vector( this.width/2 , -this.height/2 ) );   //superior right corner
  points.push( new vector( -this.width/2 , -this.height/2 ) );  //superior left corner

  return points;
}

rectangle.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
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

    if ( increment.x >= 0 && increment.x < this.width/2 )   //right
      directions[0] = true;
    if ( increment.x < 0 && -increment.x < this.width/2 )   //left
      directions[1] = true;
    if ( increment.y >= 0 && increment.y < this.height/2 )  //beneath
      directions[2]= true;
    if ( increment.y < 0 && -increment.y < this.height/2 )  //above
      directions[3] = true;

    if ( ( directions[2] || directions[3] ) && (  directions[0] || directions[1] ) )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
    result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
  result.push( pt );
    }
  return result;    // return a list of points of collision
}

rectangle.prototype.areaInertia = function()
{
  return ( this.width*this.width + this.height*this.height )/12;
}

rectangle.prototype.overlapDistance = function ( point, vel ) //returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var rectAxes = new axes( undefined, undefined, this.pos );
      rectAxes.rotate( this.rotation );
      point = rectAxes.project( point, false );     //project as a fixed vector

      if ( vel instanceof vector && ( vel.x != 0 || vel.y != 0 ) )
      {
  vel = rectAxes.project( vel );
  var slopeVel = vel.y/vel.x;
  var a = point.y - slopeVel*point.x;

  /////////////

  if ( vel.x == 0 )     //point moved vertically, non lateral wall
  {
    var x  = point.x;
    if ( vel.y >= 0 ) //point moved downwards
      var y = -this.height/2; //top wall
    else
      var y = this.height/2;
  }
  else
  {
    if ( vel.y >=0 )  //point moved downwards
    {
      if ( vel.x >= 0 )   //down-right
        var x = -this.width/2;  //left wall
      else // vel.x < 0   //down-left
        var x = this.width/2; //right wall
      var y = a + slopeVel*x;
      if ( y < -this.height/2 )   //no intersection, then intersection with upper wall
      {
        var y = -this.height/2;
        var x = ( y - a )/slopeVel;
      }
    }
    else //vel.y < 0    //point moved upwards
    {
      if ( vel.x >= 0 )   //up-right
        var x = -this.width/2;  //left wall
      else // vel.x < 0   //up-left
        var x = this.width/2; //right wall
      var y = a + slopeVel*x;
      if ( y > this.height/2 )  //no intersection, then intersection with bottom wall
      {
        var y = this.height/2;
        var x = ( y - a )/slopeVel;
      }
    }
  }
  result = rectAxes.unproject( point.minus( x, y ).multiply( -1 ) );  //'result' is a distance vector, outwards from the center of the object
      }
      if ( vel.x ==0 && vel.y == 0 )  //if 'vel' is undefined or zero, locate the shortest boundary
      {
  if ( Math.abs( point.x ) >= Math.abs( point.y ) )
  {
    if ( point.x >= 0 )         //closer to right wall
      result = rectAxes.unproject( new vector( this.width/2 - point.x, 0 ) );
    else              //closer to left wall
      result = rectAxes.unproject( new vector( -this.width/2 - point.x, 0 ) );
  }
  else
  {
    if ( point.y >= 0 )         //closer to bottom wall
      result = rectAxes.unproject( new vector( 0 , this.height/2 - point.y ) );
    else              //closer to top wall
      result = rectAxes.unproject( new vector( 0 , -this.height/2 - point.y ) );
  }
      }
    }
    return result;
}

rectangle.prototype.getNormal = function( point )       ///get the normal vector in the point of collision
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = angleCheck( point.minus( this.pos ).angle() - this.rotation );  //between [-PI, +PI)
      var alpha = Math.atan( this.height/this.width );        //between [0, PI/2)

      if (  ang >= -alpha && ang <= alpha )
  result = new vector( 1, 0 );
      else if (  ang > alpha && ang <= Math.PI - alpha )
  result = new vector( 0, 1 );
      else if (  ang > Math.PI - alpha || ang <= -Math.PI + alpha )
  result = new vector( -1, 0 );
      else  //(ang<-alpha && ang>-PI+alpha)
  result = new vector( 0, -1 );
      result.rotate( this.rotation );
    }
    return result;
}

function polygon( points )    //The polygon MUST be "monotone convex"
{
  this.rotation = 0;
  this.points = points.slice();
  this.faces = [];          //list of tangent vectors, ordered in counter-clockwise direction from points[0]
  this.normals = [];          //list of OUTER normal vectors,  ordered in counter-clockwise direction from points[0]

  //SET POINTS AROUND CENTER (ASSUMED AXES LOCATED IN TOP LEFT CORNER)
  this.pos = new vector( this.getWidth()/2 + leftMostX( this.points ) , this.getHeight()/2 + upMostY( this.points ) );
  for ( var i = 0 ; i < this.points.length ; i++ )
     this.points[i] = this.points[i].minus( this.pos );

  //CALCULATE SIDES
  for ( var i = 0 ; i < this.points.length ; i++ )
  {
    var j = ( i == this.points.length - 1 ) ? 0 : i + 1 ;   //'j = i + 1', in a circular fashion
    this.faces[i] = this.points[j].minus( this.points[i] );
  }

  //ORDER POINTS CLOCKWISELY

    //angles between vectors representing the faces
    var vecAng = [];
    for ( var i = 0 ; i < this.faces.length ; i++ )
    {
      var j = ( i == this.faces.length - 1 ) ? 0 : i + 1 ;
      vecAng[i] = this.faces[i].angle( this.faces[j] )      ;//> 0 clockwise, < 0 counter-clockwise
    }

    //check if the polygon is drawn clockwise or counter-clockwise
    var sum = 0;
    for ( var i = 0 ; i < vecAng.length ; i++ )
      sum += vecAng[i];                     //> 0 clockwise, < 0 counter-clockwise

    //make it counter-clockwise
    if ( sum > 0 )
      this.points.reverse();

    //begin with the point of max angle ( for getNormal() )
    var maxAng = -Infinity;
    var maxIndex = 0;
    for ( var i = 0 ; i < this.points.length ; i++ )  //look for the minimum
    {
      var ang = this.points[i].angle2();
      if ( ang > maxAng )
      {
  maxAng = ang;
  maxIndex = i;
      }
    }
    for ( var i = 0 ; i < maxIndex ; i++ )  //reorder
      this.points.push( this.points.shift() );  //put the first ones at the end

  //RE-CALCULATE SIDES
  for ( var i = 0 ; i < this.points.length ; i++ )
  {
    var j = ( i == this.points.length - 1 ) ? 0 : i + 1 ;
    this.faces[i] = this.points[j].minus( this.points[i] );
  }

  //CALCULATE OUTER NORMALS
  for ( var i = 0 ; i < this.faces.length ; i++ )
  {
    this.normals[i] = new vector( -this.faces[i].y, this.faces[i].x );
    this.normals[i] = this.normals[i].direction();
  }

  //CALCULATE 'VISIBILITY' POINTS AND ANGLES - the 'visibility point' and its two 'visibility angles' form an arc that represents what the face 'sees' or 'faces'
    this.vPts = [];
    this.vAngs = [];

    //A) GET ANGLES AND SLOPES
    var angList = this.getInnerAngles();
    angList.unshift( angList.pop() ); //put last first, so first angle is first vertex
    var slopes = [];
    for ( var i = 0 ; i < angList.length ; i++ )
    {
      var ang = angleCheck2( this.faces[i].angle2() - angList[i]/2 ); //the angle is half of the inner angle
      this.vAngs.push( ang );
      slopes.push( Math.tan( ang ) );
    }

    //B) GET INTERSECTING POINTS - the intersection of the two rects that pass through the middle of the inner angle for two consecutive vetices. It's where the 'observer' stands
    for ( var i = 0 ; i < this.points.length ; i++ )
    {
      var j = ( i == this.points.length - 1 ) ? 0 : i + 1 ;
      var a1 = this.points[i].y - slopes[i]*this.points[i].x;
      var a2 = this.points[j].y - slopes[j]*this.points[j].x;
      var x = ( a2 - a1 )/( slopes[i] - slopes[j] );
      var y = a1 + slopes[i]*x;
      this.vPts.push( new vector( x, y ) );
    }
}

polygon.prototype.getHeight = function()
{
  return ( downMostY( this.points ) - upMostY( this.points ) );
}

polygon.prototype.getWidth = function()
{
  return ( rightMostX( this.points ) - leftMostX( this.points ) );
}

polygon.prototype.area = function()
{
  var Area = 0;
  var vecAng = [];

  //Modulus of the cross-product (ie. area of paralellepipede formed by each pair of vectors)
  for ( var i = 0 ; i < this.points.length ; i++ )
  {
    var j = ( i == this.points.length - 1 ) ? 0 : i + 1 ;   //'j = i + 1', in a circular fashion
    Area += this.points[i].modulus()*this.points[j].modulus()*Math.abs( Math.sin( this.points[i].angle( this.points[j] ) ) );
  }
  return Area/2;
}

polygon.prototype.areaInertia = function()//Calculation as the addition of triangles, assuming CONCAVE, and center of mass/rotation the center of the bounding box.
{
  //Areas of the triangles (between center and vertices)
  var Area = [];
  for ( var i = 0 ; i < this.points.length ; i++ )
  {
    var j = ( i == this.points.length - 1 ) ? 0 : i + 1 ;
    Area[i] = this.points[i].modulus()*this.points[j].modulus()*Math.abs( Math.sin( this.points[i].angle( this.points[j] ) ) );
  }

  //Addition of MOIs for each triangle ( as function of the vertices' vectors )
  var aux = 0;
  for ( var i = 0 ; i < this.points.length-1 ; i++ )
    aux += ( this.points[i].project( this.points[i] )
  + this.points[i].project( this.points[i+1] )
  + this.points[i+1].project( this.points[i+1] ) ) * Area[i]/2;
  aux += ( this.points[0].project( this.points[0] )
  + this.points[0].project( this.points[this.points.length-1] )
  + this.points[this.points.length-1].project( this.points[this.points.length-1] ) ) * Area[this.points.length-1]/2;

  //Final factor
  return aux/( 6*this.area() );
}

polygon.prototype.isConvex = function ( angleList )
{
  var angles = angleCheck( angleList ) || this.getInnerAngles();
  var result = false;

  for ( var i = 0 ; i < angles.length ; i++ )
    if ( angles[i] > Math.PI )
      result = true;
  return result;
}

polygon.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var inside = true;
    var polyAxes = new axes( undefined, undefined, this.pos );
    polyAxes.rotate( this.rotation );
    var pt = polyAxes.project( item, false );   //as fixed vector

    for ( var i = 0 ; i < this.normals.length ; i++ )
    {
      var increment = pt.minus( this.points[i] );
      if ( increment.project( this.normals[i] ) > 0 )
      {
  inside = false;
  i = this.normals.length;
      }
    }
    if ( inside )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
    result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
  result.push( pt );
    }
  return result;    // return a list of points of collision
}

polygon.prototype.overlapDistance = function ( point, vel ) //returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var polyAxes = new axes( undefined, undefined, this.pos );
      polyAxes.rotate( this.rotation );
      point = polyAxes.project( point, false );     //project as a fixed vector

      if ( vel instanceof vector && ( vel.x != 0 || vel.y != 0 ) )
      {
  if ( vel.x != 0 )   //nonvertical velocity
  {
    vel = polyAxes.project( vel );
    var slopeVel  = vel.y/vel.x;
    var aV = point.y - slopeVel*point.x;

    for ( var i = 0 ; i < this.points.length ; i++ )
      if ( vel.project( this.normals[i] ) < 0 )     //condition for a face to have been crossed by the point with this velocity
      {
        //CALCULATE INTERSECTION WITH EACH SEGMENT'S RECT
        if ( this.faces[i].x != 0 ) //nonvertical face
        {
          var slopeFace = this.faces[i].y/this.faces[i].x;
          var aF = this.points[i].y - slopeFace*this.points[i].x;
          var x = ( aV - aF )/( slopeFace - slopeVel );
          var y = aV + slopeVel*x;
        }
        else  //vertical face, nonvertical velocity
        {
          var aV = point.y - slopeVel*point.x;
          var x = this.points[i].x;
          var y = aV + slopeVel*x;
        }
        ///CHECK THAT THE POINT IS IN THE SEGMENT
        if ( i < this.points.length - 1 )
          if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
              ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
            i = this.points.length; //exit loop, we found the desired point
      }
  }
  else //vertical velocity
    for ( var i = 0 ; i < this.points.length ; i++ )
      if ( vel.project( this.normals[i] ) < 0 && this.faces[i].x != 0 )     //condition for a face to have been crossed by the point with this velocity
      {
        //CALCULATE INTERSECTION WITH EACH SEGMENT'S RECT
        var slopeFace = this.faces[i].y/this.faces[i].x;
        var aF = this.points[i].y - slopeFace*this.points[i].x;
        var x = point.x;
        var y = aF + slopeFace*x;

        ///CHECK THAT THE POINT IS IN THE SEGMENT
        if ( i < this.points.length - 1 )
    if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
      ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
      i = this.points.length; //exit loop, we found the desired point
      }

  result = polyAxes.unproject( point.minus( x, y ).multiply( -1 ) );  //'result' is a distance vector, outwards from the center of the object
      }
      if ( vel.x ==0 && vel.y == 0 )  //if 'vel' is undefined or zero, locate the shortest boundary
      {
  var p = [];
  for ( var i = 0 ; i < this.points.length ; i++ )
  {
    if ( this.faces[i].x != 0 && this.faces[i].y != 0  )  //non-vertical, non-horizontal face
    {
      var slopeFace = this.faces[i].y/this.faces[i].x;
      var slopeNormal = this.normals[i].y/this.normals[i].x;
      var aF = this.points[i].y - slopeFace*this.points[i].x;
      var aN = point.y - slopeNormal*point.x;
      var x = ( aN - aF )/( slopeFace - slopeNormal );
      var y = aN + slopeNormal*x;
    }
    else if ( this.faces[i].x == 0 ) //vertical face
    {
      var x = this.points[i].x;
      var y = point.y;
    }
    else        //horizontal face
    {
      var x = point.x;
      var y = this.points[i].y;
    }

    if ( i < this.points.length - 1 )
    {
      if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
        ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
        p.push( new vector( x, y ) );
    }
    else
      if ( ( ( x > this.points[i].x && x < this.points[0].x ) || ( x < this.points[i].x && x > this.points[0].x ) ) &&
        ( ( y > this.points[i].y && y < this.points[0].y ) || ( y < this.points[i].y && y > this.points[0].y ) ) )
        p.push( new vector( x, y ) );
  }

  var dmin = Infinity;
  var incrMin = undefined;
  for ( var i = 0 ; i < this.points.length ; i++ )
  {
    if ( p[i] )
    {
      var incr = point.minus( p[i] );
      var d = incr.modulus();
      if ( d < dmin )
      {
        dmin = d;
        incrMin = incr;
      }
    }
  }
  result = polyAxes.unproject( incrMin.multiply( -1 ) );  //'result' is a distance vector, outwards from the center of the object
      }
    }
    return result;
}

polygon.prototype.getNormal = function( point )       ///get the normal vector in the point of collision
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = angleCheck2( point.minus( this.pos ).angle2() - this.rotation );  //between [0, 2PI)
      var alpha = [];
      for ( var i = 0 ; i < this.points.length ; i++ )
  alpha[i] = this.points[i].angle2();           //between [0, 2PI)

      for ( var i = 0 ; i < alpha.length - 1 ; i++ )
  if (  ang <= alpha[i] && ang > alpha[i+1] )
    result = new vector( this.normals[i] );
      if (  result == undefined )
  result = new vector( this.normals[ alpha.length - 1 ] );
      result.rotate( this.rotation );
    }
    return result;
}

polygon.prototype.getInnerAngles  = function () //retreive the INNER angles between the sides of the polygon. Angles between ( 0 , 2PI )
{
  var angList = [];
  for ( var i = 0 ; i < this.faces.length ; i++ )   //the angle between two segments is the complementary to the angle between vectors
  {
    var j = ( i == this.faces.length - 1 ) ? 0 : i + 1 ;    //'j = i + 1', in a circular fashion
    angList.push( Math.PI + this.faces[i].angle( this.faces[j] ) );
  }
  return angList;
}

polygon.prototype.splitPolygon = function ( clockwise , startIndex, jump )  //split into a set of concave polygons. Returns the list of polygons
{
  var polygonList = [];

  clockwise = ( clockwise == undefined ) ? false : clockwise ;
  jump = ( jump == undefined ) ? false : jump ;

  var points = this.points.slice();
  var angles = this.getInnerAngles();

  //REORDER IF IN CLOCKWISE CASE: 'Z' patterns fail in one direction, but not in the other
  if ( clockwise )
  {
    points.reverse();
    points.unshift( points.pop() );       //put last one first
    angles.reverse();
    angles.push( angles.shift() );     //put first one last
  }

  if ( startIndex == undefined )
  {
    //LOOK FOR A LAST CONVEX ANGLE TO BEGIN THE ALGORITHM WITH
    startIndex = 0;
    for ( var i = 0 ; i < angles.length - 1 ; i++ )
      if ( angles[i] > Math.PI && angles[i+1] < Math.PI )
  startIndex = i + 1;

    //REORDER THE PATH TO BEGIN WITH THIS ANGLE
    for ( var i = 0 ; i < startIndex ; i++ )
    {
      points.push( points.shift() );  //put the first ones at the end
      angles.push( angles.shift() );
    }
  }
  else  // BEGIN WITH THE GIVEN ANGLE
  {
    if ( clockwise )
      startIndex = points.length - startIndex;
    for ( var i = 0 ; i < startIndex ; i++ )
    {
      points.push( points.shift() );  //put the first ones at the end
      angles.push( angles.shift() );
    }
    while( angles[0] > Math.PI )  //look for the closest last concave
    {
      points.push( points.shift() );  //put the first ones at the end
      angles.push( angles.shift() );
    }
  }
  //CHECK EACH CONSECUTIVE ANGLE WHILE FORMING A POLYGON, AND SPLIT WHERE IT BECOMES CONVEX
  var angSum = 0;
  var newAng = 0;
  for ( var i = 0 ; i < angles.length ; i++ )
  {
    if ( i > 1 && i < angles.length - 1 )
      if ( !clockwise )
  newAng = Math.PI + points[i+1].minus( points[i] ).angle( points[0].minus( points[i+1] ) );  //angle if we closed the polygon here
      else
  newAng = Math.PI - points[i+1].minus( points[i] ).angle( points[0].minus( points[i+1] ) );

    //CONVEXITY CHECK: check A) if the polygon is convex so far ( ie. if we closed it, the new two angles are < PI ) or B) the current angle would make it convex (> PI)
    if ( angles[i] > Math.PI || ( i < angles.length -1 &&  i*Math.PI - angSum - newAng > Math.PI ) || ( i > 1 && newAng > Math.PI ) )
    {
      //CHOOSE THE SLICE POINT
      if ( ! ( ( i < angles.length -1 &&  i*Math.PI - angSum - newAng > Math.PI )  ||  ( i > 1 && newAng > Math.PI ) ) )
  i++;

      //DIVIDE THE POLYGON AT THE CONFLICTING POINT
      var points1 = points.slice( 0 , i + 1 ) ;
      var points2 = points.slice( i );

      var P1 = new polygon( points1 );

      //CHECK THAT THE POLYGONS DO NOT OVERLAP (AND MAKE CORRECTIONS)
      var failure = false;
      while( !failure && P1.ptsInside( points2.slice( 1 ) ).length > 0  ) //don't count the first point of P2, as it is shared with P1
      {
  if ( P1.points.length > 3 )
  {
    points1.pop();            //remove the last point of P1 (that is shared with P2)
    points2.unshift( points1[ points1.length - 1 ] ); //make P2 begin in the new last point of P1 (so that they share it)
    P1 = new polygon( points1 );
  }
  else
  {
    failure = true; //if it is reduced to a triangle and there is still overlap, the algorithm has failed -> solve clockwise
    P1 = undefined;
  }
      }

      //SAVE POLYGON P1 AND CONTINUE DIVIDING P2
      if ( !failure )
      {
  P1.pos = this.pos.add( P1.pos );        //P1 and P2 are initialized respect to the coordinates of the original polygon
  polygonList.push( P1 );

  var P2 = new polygon( points2.concat( points[0] ) );  //close P2 with the first point of P1
  P2.pos = this.pos.add( P2.pos );
  polygonList = polygonList.concat( P2.splitPolygon( clockwise ) );
      }
      else
      //IF DIVISION FAILED (point overlap), SOLVE AGAIN OPPOSITE DIRECTION
      {
  if ( !jump )
  {
    if ( clockwise )
      startIndex = points.length - startIndex;
    polygonList = polygonList.concat( this.splitPolygon( !clockwise , startIndex, true ) ); //if it fails again ('saddle' point), JUMP to next concave point
  }
  else  //'SADDLE' POINT: jump to next concave point and begin again
  {
    var index = 0;
    for ( var j = 0 ; j < angles.length ; j++ ) //look for the next concave point
      if ( angles[j] > Math.PI )
      {
        index = j;
        j = angles.length;
      }
    if ( clockwise )
      index = ( points.length - startIndex - index - 1 ) % ( this.points.length );
    else
      index = ( startIndex + index + 1 ) % ( this.points.length );
    polygonList = polygonList.concat( this.splitPolygon( !clockwise , index, false ) );
  }
      }
      i = angles.length;  //exit loop
    }
    angSum += angles[i];
  }

  //BASE CASE FOR RECURSION
  if ( polygonList.length == 0 )
    polygonList = [ this ];
  return polygonList;
}

polygon.prototype.globalPoints = function()
{
  var retList = this.points.slice();
  for ( var i = 0 ; i < retList.length ; i++ )
    retList[i] = retList[i].add( this.pos );
  return retList;
}

polygon.prototype.isFacing = function ( point ) //returns the face (index) that is 'seeing' or 'facing' a point
{
  var faceIndex = undefined;

  //Convert to the polygon axes
  var polyAxes = new axes( undefined, undefined, this.pos );
  polyAxes.rotate( this.rotation );
  point = polyAxes.project( point, false );   //as fixed vector

  //See if the point is outer or inner to each face
  var projections = [];
  for ( var i = 0 ; i < this.normals.length ; i++ )
    projections.push( point.minus( this.points[i] ).project( this.normals[i] ) );

  //Change the coordinates to each visibility point, and check if the point is inside the visibility angles
  for ( var i = 0 ; i < this.vPts.length ; i++ )
    if ( projections[i] > 0 )
    {
      var polyAxes = new axes( undefined, undefined, this.vPts[i] );
      polyAxes.rotate( this.rotation );
      var pt = polyAxes.project( point, false );    //as fixed vector

      var j = ( i == this.vPts.length - 1 ) ? 0 : i + 1 ;   //'j = i + 1', in a circular fashion
      var ang1 = angleCheck2( this.vAngs[i] - Math.PI );
      var ang2 = angleCheck2( this.vAngs[j] - Math.PI );
      var ang = pt.angle2();
      if ( ( ang <= ang1 && ang > ang2 ) )
      {
  faceIndex = i;
  i = this.vPts.length ;
      }
      else if ( ang2 > ang1 )
  faceIndex = i;
    }
  return faceIndex;
}

polygon.prototype.distanceFromFaceTo = function( point )
{
  var index = this.isFacing( point );
  return point.minus( this.globalPoints()[index] ).project( this.normals[index] );
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

circle.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var increment = this.pos.minus( item );
    if ( increment.sqModulus() < this.radius*this.radius )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
  result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
  result.push( pt );
    }
  return result;  //  return 'undefined' or the point of collision
}

circle.prototype.areaInertia = function()
{
  return ( this.radius*this.radius )/2;
}

circle.prototype.overlapDistance = function ( point, vel )  //returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var circAxes = new axes( undefined, undefined, this.pos );
      point = circAxes.project( point, false );     //project as a fixed vector

      if ( vel instanceof vector && ( vel.x != 0 || vel.y != 0 ) )
      {
  var slopeVel = vel.y/vel.x;
  var offset = point.y - slopeVel*point.x;

  /////////////

  if ( vel.x != 0 )
  {
    var a = 1 + slopeVel*slopeVel;
    var b = 2*slopeVel*offset;
    var c = offset*offset - this.radius*this.radius;

    if ( vel.x > 0 )            //point moved in right direction
      var x = ( -b - Math.sqrt( b*b - 4*a*c ) )/( 2*a );    //leftmost point in boundary
    else
      var x = ( -b + Math.sqrt( b*b - 4*a*c ) )/( 2*a );    //rightmost point in boundary

    var y = offset + slopeVel*x;
  }
  else    //vertical movement
  {
    if ( vel.y >= 0 )             //point moved downwards
      var y = -Math.sqrt( this.radius*this.radius - point.x*point.x );  //top boundary
    else
      var y = Math.sqrt( this.radius*this.radius - point.x*point.x ); //botom boundary
  }
      }
      else    //if 'vel' is undefined or zero, locate the shortest boundary
      {
  var ang = point.angle();
  var x = this.radius*Math.cos( ang );
  var y = this.radius*Math.sin( ang );
      }
      result = circAxes.unproject( point.minus( x, y ).multiply( -1 ) );  //return an outwards vector
    }
    return result;
}

circle.prototype.getNormal = function( point )      ///get the normal vector in the point of collision
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ang = point.minus( this.pos ).angle();
      result = new vector( this.radius*Math.cos( ang ) , this.radius*Math.sin( ang ) );
    }
    return result;
}

function ellipse( radiusA, radiusB, center, rotation )  //radius A is the Y axis
{
  this.pos = center || new vector( 0, 0 );
  this.radiusA = radiusA || 20;
  this.radiusB = radiusB || 10;
  this.rotation = rotation || 0;
  this.points = this.samplePoints();
}

ellipse.prototype.samplePoints =  function( number )
{
  number = number || 12;
  var points = [];
  for ( var i = 0 ; i < number ; i++ )
    points.push( new vector( this.radiusB*Math.cos(2*i*Math.PI/number) , this.radiusA*Math.sin(2*i*Math.PI/number) ) );
  return points;
}

ellipse.prototype.areaInertia = function()
{
  return ( this.radiusA*this.radiusA + this.radiusB*this.radiusB )/4;
}

ellipse.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var increment = this.pos.minus( item );
    if ( this.rotation != 0 )
    {
      var ellipseAxes = new axes();
      ellipseAxes.rotate( this.rotation );
      increment = ellipseAxes.project( increment );
    }
    if ( increment.x*increment.x/(this.radiusB*this.radiusB) + increment.y*increment.y/(this.radiusA*this.radiusA) < 1 )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
  result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
      {
  var pt = new vector ( item.points[i] );
  pt.rotate( item.rotation );
  pt = pt.add( item.pos );
  if ( this.ptsInside( pt ).length > 0 )
    result.push( pt );
      }
  return result;    //  return 'undefined' or the point of collision
}

ellipse.prototype.overlapDistance = function ( point, vel ) //returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ellipseAxes = new axes( undefined, undefined, this.pos );
      ellipseAxes.rotate( this.rotation );
      point = ellipseAxes.project( point, false );      //project as a fixed vector

      if ( vel instanceof vector && ( vel.x != 0 || vel.y != 0 ) )
      {
	vel = ellipseAxes.project( vel );
	var slopeVel = vel.y/vel.x;
	var offset = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x != 0 )
	{
	  var a = 1/(this.radiusB*this.radiusB) + slopeVel*slopeVel/(this.radiusA*this.radiusA);
	  var b = 2*slopeVel*offset/(this.radiusA*this.radiusA);
	  var c = offset*offset/(this.radiusA*this.radiusA) - 1;

	  if ( vel.x > 0 )            //point moved in right direction
	    var x = ( -b - Math.sqrt( b*b - 4*a*c ) )/( 2*a );    //leftmost point in boundary
	  else
	    var x = ( -b + Math.sqrt( b*b - 4*a*c ) )/( 2*a );    //rightmost point in boundary

	  var y = offset + slopeVel*x;
	}
	else    //vertical movement
	{
	  if ( vel.y >= 0 )             //point moved downwards
	    var y = -this.radiusA*Math.sqrt( 1 - point.x*point.x/( this.radiusB*this.radiusB ) ); //top boundary
	  else
	    var y =  this.radiusA*Math.sqrt( 1 - point.x*point.x/( this.radiusB*this.radiusB ) ); //botom boundary
	}
      }
      else//if 'vel' is undefined or zero, approximate the closest boundary by the one in radial direction ( no exact analytical solution )
      {
	var ang = point.angle();
	var x = this.radiusB * Math.cos( ang );
	var y = this.radiusA * Math.sin( ang );
      }
      result = ellipseAxes.unproject( point.minus( x, y ).multiply(-1) ); //return an outwards vector
    }
      return result;
}

ellipse.prototype.getNormal = function( point )       ///get the normal vector in the point of collision
{
  var result = undefined;
  if ( point instanceof vector )
  {
    var ang = angleCheck( point.minus( this.pos ).angle() - this.rotation );  //between [-PI, +PI)
    result = new vector( this.radiusA*Math.cos( ang ) , this.radiusB*Math.sin( ang ) );
    result.rotate( this.rotation );
  }
  return result;
}

/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function rotation( angVelocity, center, friction, targetAngle )
{
  this.angVelocity = ( angVelocity == undefined ) ? shiftAngle : angVelocity ;
  this.center = center;
  this.friction = friction || defFriction;
  this.targetAngle = targetAngle;
  this.cancel = false;
}

rotation.prototype.advance = function()
{
  if ( this.friction != 0 )
    this.accelerate( -this.friction )
  return this.angVelocity;
}

rotation.prototype.isFinished = function()
{
  return this.angVelocity == 0;
}

rotation.prototype.accelerate = function ( angAcc )
{
    angAcc = angAcc || defAngAcc;

  if ( this.angVelocity >= 0 )
  {
    this.angVelocity += angAcc;
    if ( this.angVelocity < 0 )
      this.angVelocity = 0;
  }
  else
  {
    this.angVelocity -= angAcc;
    if ( this.angVelocity > 0 )
      this.angVelocity = 0;
  }
}

function movement ( owner, initialDir, speed, friction, oriented )
{
  this.owner = owner;

  //PARAMETERS
  this.direction = ( initialDir == undefined ) ? new vector( 0, -1 ) : new vector( initialDir );
  this.direction = this.direction.direction();
  this.friction = friction || defFriction;
  this.oriented = ( oriented == undefined ) ? false : oriented;      //indicates if the orientation of the element is to be the same as the direction of movement
  this.speed = speed;       //this is the proposed speed, 'undefined' means use current speed

  //SCHEDULED ACTIONS
  this.add  = false
  this.cancel = false;
  this.replace  = false;

  //COMPONENTS
  this.components = [];   //list with extra components to the movement, to add vectorially
  this.weight   = 1;    //default weight to average when it is used as the component of a complex movement

  //RANDOM CHARACTERISTICS
  this.RAngle = undefined;
  this.RCurv  = undefined;
  this.RSpeed = undefined;
}

movement.prototype.advance = function () ///Returns the increment for each frame
{
  //Friction
  if ( this.friction > 0 )  //none
    this.owner.deccelerate( this.friction );

  //Random components
  if ( this.RSpeed || this.RCurv || this.RAngle )
    this.randomize();
  if ( this.RCurv )
    this.direction.rotate( this.curvature*this.owner.speed );

  //Movement itself
  return this.velocity();
}

movement.prototype.velocity = function ()   //returns the averaged direction of a movement, taking into account its components
{
  if ( this.components.length == 0 )
    var result = this.direction.multiply( this.owner.speed );
  else
  { //AVERAGE COMPONENTS - add unitary vectors weighted
    var result = this.direction.multiply( this.weight );  //this component

    for ( var i = 0 ; i < this.components.length ; i++ )
    {
      this.components[i].advance();
      result = result.add( this.components[i].direction.multiply( this.components[i].weight ) );//add each component, with modulus one and scaled by the weight
    }

    var mod = result.modulus();
    if ( mod != 0 )
      result = result.multiply( this.owner.speed/mod ); //make modulus one and scale by element's speed
    else
      result = new vector( 0 , 0 );
  }
  return result;
}

movement.prototype.isFinished = function ()
{
  return this.owner.speed == 0;
}

function arrowMovement ( owner, dir, speed, friction )
{
  this.up   = false;
  this.down   = false;
  this.right  = false;
  this.left = false;

  movement.call( this, owner, undefined, speed, friction );
  this.addDir( dir );
}
arrowMovement.prototype = new movement();
arrowMovement.prototype.constructor = arrowMovement;

arrowMovement.prototype.addDir = function( dir, add )   //add/substract a component to the movement and return resulting direction
{
  add = ( add == undefined ) ? true : add ;
  if ( dir )
  {
    if ( dir == 1 )
      this.up = add;
    else if ( dir == 2 )
      this.down = add;
    else if ( dir == 3 )
      this.right = add;
    else if ( dir == 4 )
      this.left = add;
    ////////////////////
    var direction = new vector( 0, 0 );
    if ( this.up )
      direction = direction.add( 0, -1 );
    if ( this.down )
      direction = direction.add( 0, 1 );
    if ( this.right )
      direction = direction.add( 1, 0 );
    if ( this.left )
      direction = direction.add( -1, 0 );
  }
  if( direction.x != 0 || direction.y != 0 )
    this.direction = direction.direction();
}

arrowMovement.prototype.isFinished = function ()
{
  return ( !this.up && !this.down && !this.right && !this.left );
}

function rectMovement( owner, position, speed, oriented )
{
  movement.call( this, owner, undefined, speed, undefined, oriented );

  if ( this.owner )
  {
    this.targetPos = position || new vector();
    this.increment = this.targetPos.minus( this.owner.pos );
    this.direction = this.increment.direction();
  }
}
rectMovement.prototype = new movement();
rectMovement.prototype.constructor = rectMovement;

rectMovement.prototype.advance = function()
{
  this.direction = this.increment.direction();
  var result   = movement.prototype.advance.call( this );
  return result;
}

rectMovement.prototype.isFinished = function ()
{
  var result = false;
  this.increment = this.targetPos.minus( this.owner.pos );
  if ( this.increment.sqModulus() <= this.owner.speed*this.owner.speed )
  {
    this.owner.pos = new vector( this.targetPos );
    result = true;
  }
  return result;
}

function landMovement( owner, destPos, speed )      //movement with a constant decceleration that ends in the destination with velocity 0
{
  this.targetPos = destPos;
  var increment = this.targetPos.minus( owner.pos );
  movement.call( this, owner, increment, speed );
  var distance = increment.modulus();
  var spd = this.speed || this.owner.speed || baseSpeed;
  this.decceleration = 0.5*spd*spd/distance;
}
landMovement.prototype = new rectMovement();
landMovement.prototype.constructor = landMovement;

landMovement.prototype.advance = function()
{
  this.owner.deccelerate( this.decceleration );
  return movement.prototype.advance.call( this );
}

function softMovement( owner, destPos, speed, dist ,percentage )  //hybrid movement:'rect' movement that, at a certain point becomes a land movement
{
  this.targetPos = destPos || new vector();
  this.increment = this.targetPos.minus( owner.pos );
  movement.call( this, owner, this.increment, speed );

  this.landing  = false;
  this.distOrig = this.targetPos.minus( this.owner.pos ).modulus();
  this.distChange = dist || 20;     //indicates the max distance to destination point to begin 'landing'
  this.percentage = percentage || 0.9;    //indicates the max percentage point of the movement to begin 'landing' (default: 90%)
  this.noLand = false;
}
softMovement.prototype = new movement();
softMovement.prototype.constructor = softMovement;

softMovement.prototype.advance = function()
{
  var distLeft = this.targetPos.minus( this.owner.pos ).modulus();
  //BEGIN WITH A BASIC MOVEMENT
  if ( distLeft > this.distChange && 1 - distLeft/this.distOrig < this.percentage )
    return movement.prototype.advance.call( this );

  //CHANGE INTO A LAND MOVEMENT
  else if ( !this.landing )
  {
    this.landing = true;
    landMovement.call( this, this.owner, this.targetPos, this.owner.speed ); //convert into a land movement
  }
  //USE LANDING MOVEMENT ADVANCE MODE
  if ( this.landing )
    return landMovement.prototype.advance.call( this );
}

softMovement.prototype.cancelLand = function()  //cancel landing (becomes a rect movement), to use in a sequence of movements for all except the last one
{
  this.distChange = 0;
  this.percentage = 1;
  this.noLand = true;
}

softMovement.prototype.isFinished = function()  //cancel landing (becomes a rect movement), to use in a sequence of movements for all except the last one
{
  if( this.noLand )
  {
    if ( this.owner.distanceTo( this.targetPos ) <= this.owner.speed )
    {
      this.owner.pos = new vector( this.targetPos );
      return true;
    }
    else
      return false;
  }
  else
    return movement.prototype.isFinished.call( this );
}

function circleMovement( owner, initialDir, curvature, speed )
{
  movement.call( this, owner, initialDir, speed );
  this.curvature = curvature || 5*Math.PI/180;
}
circleMovement.prototype = new movement();
circleMovement.prototype.constructor = circleMovement;

circleMovement.prototype.advance = function()
{
    this.direction.rotate( this.curvature*this.owner.speed );
    return movement.prototype.advance.call( this );
}

// function curvedMovement( owner, destPos, /*curvature,*/ speed )
// {
//   rectMovement.call( this, owner, destPos, undefined, speed );//use rectMovement as a prototype for parametric movement
//   this.direction.rotate( -Math.PI/2 );
//   this.radius    = this.distance/2; //Max curvature. input radius for more complexity?
//   this.arch    = this.radius*Math.PI;
//   this.steps     = this.arch/this.owner.speed;
//   this.curvature = Math.PI/this.steps;
// }
// curvedMovement.prototype = new rectMovement();
// curvedMovement.prototype.constructor = curvedMovement;
//
// curvedMovement.prototype.advance = function()
// {
//     this.currentSteps++;
//     this.direction.rotate( this.curvature*this.owner.speed );
//     return movement.prototype.advance.call( this );
// }

function carMovement( owner, initialDir, inicSpeed )
{
  movement.call( this, owner, initialDir, undefined, baseAccel/2 );
  this.steerState = 0;          // 0 - none, 1 - steer right , 2 - steer left
  this.owner.speed = inicSpeed || baseSpeed;
}
carMovement.prototype = new movement();
carMovement.prototype.constructor = carMovement;

carMovement.prototype.advance = function ()
{
  if ( this.steerState == 1 )
    this.direction.rotate( shiftAngle );
  else if ( this.steerState == 2 )
    this.direction.rotate( -shiftAngle );

  return movement.prototype.advance.call( this );
}

function chaseMovement( owner, target, speed )
{
  movement.call( this, owner, target.pos, speed );
  this.target = target;
}
chaseMovement.prototype = new movement();
chaseMovement.prototype.constructor = chaseMovement;

chaseMovement.prototype.advance = function()
{
  this.direction = this.target.pos.minus( this.owner.pos ).direction();
  return movement.prototype.advance.call( this );
}

chaseMovement.prototype.isFinished = function ()
{
  var result = false;
  if ( this.target && overlapPoints( this.owner , this.target ) )
    result = true;

  return result;
}

function fleeMovement( owner, target, speed )
{
  movement.call( this, owner, target.pos, speed );
  this.target = target;
}
fleeMovement.prototype = new movement();
fleeMovement.prototype.constructor = fleeMovement;

fleeMovement.prototype.advance = function()
{
  this.direction = this.owner.pos.minus( this.target.pos ).direction();
  return movement.prototype.advance.call( this );
}

function detourMovement( owner, obj, target, dist, speed )    //move around a scene item
{
  movement.call( this, owner, undefined, speed );
  this.obj = obj;
  this.dist = dist || 40;
  this.clockwise = undefined;
  this.updateDir( target ); //two modes: with 'target', goes the shortest way. without 'target', smoothing the direction change
}
detourMovement.prototype = new movement();
detourMovement.prototype.constructor = detourMovement;

detourMovement.prototype.advance = function()
{
  // LOOK FOR CLOSEST FACE
  var minDist = Infinity;
  var normal = undefined;
  var face = undefined;

  var index = this.obj.shape.isFacing( this.owner.pos );
  var distFace = this.owner.pos.minus( this.obj.shape.globalPoints()[index] ).project( this.obj.shape.normals[index] );
  if ( distFace < minDist )
  {
    minDist = distFace;
    normal  = this.obj.shape.normals[index];
    face  = this.obj.shape.faces[index];;
  }

  //SET DIRECTION, to move away from face and go around
  if( minDist < this.dist )
  {
    this.direction = new vector( normal );
    if ( this.clockwise )
      this.direction.rotate( minDist/this.dist*Math.PI/2 );
    else
      this.direction.rotate( -minDist/this.dist*Math.PI/2 );
  }
  else
  {
    this.direction = face.direction();
    if ( this.clockwise )
      this.direction = this.direction.multiply( -1 );
  }
  return movement.prototype.advance.call( this );
}

detourMovement.prototype.updateDir = function( target )//re-check direction to avoid the obstacle the shortest way.
{
  if ( target )
    this.clockwise = target.pos.minus( this.owner.pos ).rotate( Math.PI/2 ).project( this.obj.pos.minus( this.owner.pos ) ) > 0;
  else if ( this.clockwise == undefined )
  {
    var vel = this.owner.velocity();
    if ( !vel.equals( 0 , 0 ) )
      this.clockwise = this.obj.pos.minus( this.owner.pos ).project( vel.rotate( Math.PI/2 ) ) > 0;//Has to be used outside advance() to avoid recursion
  }
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
      this.owner.speed = this.RSpeed.avg + this.RSpeed.std*( Math.random() - 0.5 );
      this.RSpeed.period = this.RSpeed.avgPeriod + this.RSpeed.stdPeriod*( Math.random() - 0.5 );
      this.RSpeed.count = 0;
      this.RSpeed.avgPeriod = 5/this.owner.speed;
      this.RSpeed.stdPeriod = 2.5/this.owner.speed;
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
      this.RCurv.avgPeriod = 5/this.owner.speed;
      this.RCurv.stdPeriod = 2.5/this.owner.speed;
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
      this.RAngle.avgPeriod = 5/this.owner.speed;
      this.RAngle.stdPeriod = 2.5/this.owner.speed;
    }
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

function definitions( id )  //object corresponding to a <def> tag, that contains information to create elements in the game
{
  if ( !id ) return;
  this.SVGNode = document.getElementById( id );
  this.id = id;
}

function getUniqueUseId ( prefix )
{
  var count = 0;
  for ( var i = 0 ; i < useList.length ; i++ )
    if ( useList[i].id ==  prefix + count )
    {
      count++;
      i = 0;
    }
  return prefix + count;
}

definitions.prototype.createInstance = function ( def, constructor ) // create a new object and SVG <use> Node from the definition <def>
{
  constructor = constructor || icon;

  //Look for the <def> node
  var node = undefined;
  for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    if ( child.getAttribute( 'id' ) == def )
      node = child;

  if ( node )
  {
    //Create the <use> node
    var useNode = document.createElementNS( 'http://www.w3.org/2000/svg' , 'use' );
    useNode.setAttribute( 'id', getUniqueUseId( node.getAttribute( 'id' ) ) );
    useNode.setAttributeNS( 'http://www.w3.org/1999/xlink' , 'href', '#' + node.getAttribute( 'id' ) );

    for ( var i = 0 ; i < node.attributes.length ; i++ )
      if ( node.attributes[i].name != 'id' && node.attributes[i].name != 'href' )
        useNode.setAttribute( node.attributes[i].name ,  node.attributes[i].value );

    //Create, register and return the element
    var useObj = new constructor( useNode );
    useList.push( useObj.SVGNode );
    return useObj;
  }
}


function part( id , parentElement, shape, coordinates ) //geometric shape that is component of an element (it is attached to the element)
{
  this.parentElement = parentElement;
  if ( id )       //indicates that the information is to be extracted from the SVG document, otherwise from the 'shape' parameter
  {
    this.SVGNode = document.getElementById( id );
    this.id = id;
    hideElement( this.SVGNode ); 

    //DIMENSIONS
    this.height = this.SVGNode.getAttribute( 'height' );
    if ( this.height == undefined || this.height == '100%' )
    {
        this.height = this.parentElement.SVGNode.getAttribute( 'height' );
  if ( this.height == undefined || this.height == '100%' )
    this.height = 10.0;
    }
    this.height = parseFloat( this.height );

    this.width  = this.SVGNode.getAttribute( 'width' );
    if ( this.width == undefined || this.width == '100%' )
    {
        this.width = this.parentElement.SVGNode.getAttribute( 'width' );
  if ( this.width == undefined || this.width == '100%' )
    this.width = this.height*window.innerWidth/window.innerHeight;
    }
    this.width = parseFloat( this.width );
    this.angle  = Math.PI/180*parseFloat( this.SVGNode.getAttribute( 'rotation' ) ) || parentElement.angle || 0;

    ///LOCATION - the part coordinates are considered relative to the element, unless the element has no 'xy' parameters defined in the SVG document
    if ( coordinates )
      this.pos = coordinates;               //center of the object
    else
    {
      var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || 0;      //'SVG coords' are top-left corners
      var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || 0;
      this.pos = new vector( readX + this.width/2, readY + this.height/2 );   //center of the object
    }
    var readShape = this.SVGNode.getAttribute( 'shape' ) || this.parentElement.SVGNode.getAttribute( 'shape' ) || '';
  }
  else
  {
    this.id = '';

    //DIMENSIONS
    this.height = this.parentElement.SVGNode.getAttribute( 'height' );
    if ( this.height == undefined || this.height == '100%' )
      this.height = 10.0;
    else
      this.height = parseFloat( this.height );

    this.width = this.parentElement.SVGNode.getAttribute( 'width' );
    if ( this.width == undefined || this.width == '100%' )
      this.width = this.height*window.innerWidth/window.innerHeight;
    else
      this.width = parseFloat( this.width );

    this.angle  = parentElement.angle || 0;
    this.pos  = coordinates || new vector( this.width/2, this.height/2 );
    var readShape = this.parentElement.SVGNode.getAttribute( 'shape' )  || '';
  }

  //DETERMINATION OF THE 'SHAPE' OBJECT THAT REPRESENTS THE PART
  if ( readShape == 'circle' || shape instanceof circle )
    this.shape = shape || this.getCircle();
  else if ( readShape == 'ellipse' || shape instanceof ellipse )
    this.shape = shape || this.getEllipse();

  //The default if ommited would be a polygon (if node is 'path'), or rectangle.
    // A) parameter node is a path ( or there is a 'shape' parameter )
    else if ( ( this.SVGNode && this.SVGNode.nodeName == 'path' && pathIsValidPolygon( this.SVGNode ) ) || shape instanceof polygon )
    {
      this.shape = shape || new polygon( pointsFromPath( this.SVGNode ) );
      this.height = this.shape.getHeight();         //only the polygon does not need manual description in the 'width,'height', fields
      this.width  = this.shape.getWidth();
      this.pos = new vector( this.shape.pos );
    }
    //B) no parameter node (ie. 'id' is undefined), and only element in the SVG parent node is a valid 'path'
    else if( this.parentElement.childElementCount == 1
          && this.parentElement.firstElementChild.nodeName == 'path' && pathIsValidPolygon( this.parentElement.firstElementChild ) )
    {
      this.shape = shape || new polygon( pointsFromPath( this.parentElement.firstElementChild ) );
      this.height = this.shape.getHeight();         //only the polygon does not need manual description in the 'width,'height', fields
      this.width  = this.shape.getWidth();
      this.pos = new vector( this.shape.pos );
    }
  //Otherwise, default to rectangle
  else
    this.shape = shape || this.getRectangle();
}

part.prototype.getShape = function ( newPos, angle )    //updates the information of the part's shape and returns it.
{
  if ( newPos instanceof vector )
    this.shape.pos = newPos;
  else
    this.shape.pos = this.parentElement.pos.add( this.pos );    //global coordinates

  if ( angle )
    this.shape.rotation = angle;
  else
  {
    var parentAng = this.parentElement.angle || 0;
    this.shape.rotation = angleCheck( this.angle + parentAng );
  }

  return this.shape;
}

part.prototype.getRectangle = function()
{
  return new rectangle( this.width, this.height, this.pos, this.angle );
}

part.prototype.getCircle = function()
{
  return new circle( this.height>this.width?this.height/2:this.width/2, this.pos );
}

part.prototype.getEllipse = function()
{
  var radiusA = this.height/2;
  var radiusB = this.width/2;
  return new ellipse( radiusA, radiusB , this.pos, this.angle );
}

part.prototype.velocity = function ()
{
  if ( this.parentElement.pointVelocity )
    return this.parentElement.velocity();
  else
    return new vector( 0 , 0 );
}

part.prototype.angVelocity = function ()
{
  if ( this.parentElement.pointVelocity )
    return this.parentElement.angVelocity();
  else
    return 0;
}

part.prototype.pointVelocity = function( point, angVel )
{
  if ( this.parentElement.pointVelocity )
    return this.parentElement.pointVelocity( point, angVel );
  else
    return new vector( 0 , 0 );
}

function icon( SVGNode, coordinates )   //most basic kind of item. Does not move. Only has a position and a shape.
{
  if ( !SVGNode ) return;
  ///GENERAL
  this.SVGNode = SVGNode;
  this.id = this.SVGNode.id;
  this.SVGNode.setAttribute( 'overflow' , 'visible' );

  //PARTS
  this.parts = [];
  var partsGNode = undefined;

  //look for the 'parts' group
  for ( var child = this.firstElementChild ; child != null ; child = child.nextElementSibling )
    if ( child.nodeName == 'g' && child.getAttribute( 'type' ) == 'parts' )
      partsGNode = child;
  //create the 'parts' elements
  if ( partsGNode )
  {
    for ( var child = partsGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.parts.push( new part( child.getAttribute( 'id' ) , this ) );
  }
  else
    this.parts.push( new part( undefined, this ) );

  //divide convex polygons into simple concave polygon 'parts'
  for ( var i = 0 ; i < this.parts.length ; i++ )
    if ( this.parts[i].shape instanceof polygon && this.parts[i].shape.isConvex() )
    {
      var polyList = this.parts[i].shape.splitPolygon();      //split into a set of concave polygons
      for ( var k = 0 ; k < polyList.length ; k++ )       //add the new concave polygons (beginning)
	this.parts.unshift( new part( undefined, this, polyList[k] ) );
      this.parts.splice( k, 1 );            //remove the convex polygon
      i = i + polyList.length - 1;            //index to start next iteration at 'same place'
    }

  ///DIMENSIONS
  var maxRight = -Infinity;
  var maxLeft  =  Infinity;
  var maxBottom= -Infinity;
  var maxTop   =  Infinity;
  for ( var i = 0 ; i < this.parts.length ; i++ )
  {
    var right = this.parts[i].pos.x + this.parts[i].width/2;
    var left  = this.parts[i].pos.x - this.parts[i].width/2;
    var bottom= this.parts[i].pos.y + this.parts[i].height/2;
    var top   = this.parts[i].pos.y - this.parts[i].height/2;
    if ( right > maxRight )
      maxRight = right;
    if ( left < maxLeft )
      maxLeft = left;
    if ( bottom > maxBottom )
      maxBottom = bottom;
    if ( top < maxTop )
      maxTop = top;
  }

  var w = this.SVGNode.getAttribute( '_width' );
  if ( w )
    this.width = parseFloat( w );
  else
    this.width  =  this.SVGNode.width == undefined ? 0 : this.SVGNode.width.baseVal.value;
  var h = this.SVGNode.getAttribute( '_height' );
  if ( h )
    this.height = parseFloat( h );
  else
    this.height  =  this.SVGNode.height == undefined ? 0 : this.SVGNode.height.baseVal.value;

  ///LOCATION
  if ( coordinates )
    this.pos = new vector ( coordinates );
  else
  {
    var readX = this.SVGNode.getAttribute( 'x' );   //'SVG coords' are top-left corner
    var readY = this.SVGNode.getAttribute( 'y' );

    if ( readX && readY )
    {
      this.pos = new vector( parseFloat( readX ) + this.width/2, parseFloat( readY ) + this.height/2 );   //if the coordinates are explicitly set in the SVG document
      for ( var i = 0 ; i < this.parts.length ; i++ )
	this.parts[i].pos = this.parts[i].pos.minus( this.width/2, this.height/2 );//set part's positions relative to the element's central position
    }
    else
    {
      this.pos = new vector( maxLeft + this.width/2, maxTop + this.height/2 );  //otherwise, the position is defined by the parts, considered in global coordinates
      for ( var i = 0 ; i < this.parts.length ; i++ )
	this.parts[i].pos = this.parts[i].pos.minus( this.pos.x + this.width/2, this.pos.y + this.height/2 );//set part's positions relative to the element's central position
    }
  }
  //BOUNDING BOX
  this.BBox = new rectangle( this.width, this.height, this.pos, this.angle );
  this.BBox.currentAngle = 0;

  ///EVENT CONFIG
  var that = this;
  if ( this.key )
    this.keyHandler = function( event ) { that.key( event ); };
  if ( this.keyStop )
    this.keyStopHandler = function ( event ){ that.keyStop( event ) };

  if ( this.mousedown )
    this.SVGNode.addEventListener( 'mousedown', function ( event ){ that.mousedown( event ) }, false );
}

icon.prototype.getPosition = function ()
{
  return new vector( this.pos );
}

icon.prototype.setPosition = function ( newPos )
{
  if ( newPos instanceof vector )
    this.pos = newPos;
  this.SVGNode.setAttribute( 'x', this.pos.x - this.width/2  );
  this.SVGNode.setAttribute( 'y', this.pos.y - this.height/2 );
}

icon.prototype.distanceTo = function( checkPoint )      ///returns distance from the center to the point
{
  return this.pos.minus( checkPoint ).modulus();
}

icon.prototype.isCloserTo = function( checkPoint, radius )    ///check if the element hits a point/zone
{
  var result = false;
  if ( checkPoint && checkPoint instanceof vector )
  {
      radius = radius || 10;
      if ( this.distanceTo( checkPoint ) <= radius )
  result = true;
  }
  return result;
}

function getShape()   //updates the information of the element's bounding box and returns it. The box is never rotated, it just adjusts its dimensions
{
  this.BBox.pos = this.pos;
  if ( this.angle && this.BBox.currentAngle != this.angle ) //if there has been rotation in this frame
 {
    //ADJUSTMENT OF THE BOUNDING BOX ON ROTATION, as the not-rotated b.box that contains the original b.box rotated
    this.BBox.currentAngle = this.angle;  //rotation angle for which it is adapted currently
    var sinA = Math.sin( this.angle );
    var cosA = Math.cos( this.angle );

    if ( this.angle >= 0 && this.angle <= Math.PI/2 )
    {
      this.BBox.width  = this.height*sinA + this.width *cosA;
      this.BBox.height = this.width *sinA + this.height*cosA;
    }
    else if ( this.angle > Math.PI/2 )
    {
      this.BBox.width  = -this.width *cosA + this.height*sinA;
      this.BBox.height = -this.height*cosA + this.width *sinA;
    }
    else if ( this.angle < 0 && this.angle >= -Math.PI/2 )
    {
      this.BBox.width  = -this.height*sinA + this.width *cosA;
      this.BBox.height = -this.width *sinA + this.height*cosA;
    }
    else// if ( this.angle < -Math.PI/2 )
    {
      this.BBox.width  = -this.width *cosA - this.height*sinA;
      this.BBox.height = -this.height*cosA - this.width *sinA;
    }
  }
  return this.BBox;
}
icon.prototype.getShape = getShape;
sceneItem.prototype.getShape = getShape;

animElement.prototype = new icon();    //new objects created with 'new' and this function will have this obj as their prototype to look up to
animElement.prototype.constructor = animElement;

function animElement( SVGNode, coordinates )	//icon that can move, translate and rotate. Without physics
{
  icon.call( this, SVGNode, coordinates );
  if ( !SVGNode ) return;
 
  //MOVEMENT
  this.orientation  = new vector( 0, -1 );        //the direction facing movement, not necessarily related to the angle of the object
  this.rotation   = undefined;          //the object describing the rotatory movement
  this.angle    = Math.PI/180*parseFloat( this.SVGNode.getAttribute( 'rotation' ) ) || 0; //the angle of rotation for the rendering transformation
  this.speed    = 0;
  this.movementList = [];
  this.nextMovAction  = { 'add':false , 'replace':false , 'cancel':false , 'nextMovement':undefined , 'nextSpeed':undefined };
  this.nextAccAction  = { 'active':false , 'nextValue':0 };

  if ( this.SVGNode.tagName != 'svg' &&  this.SVGNode.tagName != 'use' )	//movements on use elements use 'x' and 'y' attributes, whereas the rest don't have them and use translate transformation
  {
    this.translateTransform = this.SVGNode.ownerSVGElement.createSVGTransform();
    this.rotateTransform = this.SVGNode.ownerSVGElement.createSVGTransform();
    this.SVGNode.transform.baseVal.appendItem( this.translateTransform );
    this.SVGNode.transform.baseVal.appendItem( this.rotateTransform );
  }
}

animElement.prototype.setPosition = function ( newPos )
{
  if ( newPos instanceof vector )
    this.pos = newPos;

  if ( this.rotateTransform )
    this.rotateTransform.setRotate( this.angle*180/Math.PI, this.pos.x, this.pos.y );
  else
    this.SVGNode.setAttribute( 'transform', 'rotate( ' + this.angle*180/Math.PI + ',' + this.pos.x + ',' + this.pos.y + ')' );

  if ( this.translateTransform )
    this.translateTransform.setTranslate( this.pos.x, this.pos.y );
  else
  {
    this.SVGNode.setAttribute( 'x', this.pos.x - this.width/2  );
    this.SVGNode.setAttribute( 'y', this.pos.y - this.height/2 );
  }
}

animElement.prototype.setRotation = function( angle, center )
{
  if ( angle != undefined )
    this.angle = angle;
  if ( this.rotation )
    center = center || this.rotation.center;
  center = center || this.pos;

  if ( this.rotateTransform )
    this.rotateTransform.setRotate( this.angle*180/Math.PI, center.x, center.y );
  else
    this.SVGNode.setAttribute( 'transform', 'rotate( ' + this.angle*180/Math.PI + ',' + center.x + ',' + center.y + ')' );
}

animElement.prototype.velocity = function ()
{
  if ( this.nextMovAction.nextMovement )
    return this.nextMovAction.nextMovement.velocity();
  else if ( this.movementList[0] )
    return this.movementList[0].velocity();
  else
    return new vector( 0 , 0 );
}

animElement.prototype.angVelocity = function ()
{
  if ( this.rotation )
    return this.rotation.angVelocity;
  else
    return 0;
}

animElement.prototype.pointVelocity = function( point, angVel )
//returns the velocity component of a given point due to rotation.(Assumed attached to the object)
{
  var d   = point.minus(  this.pos );
  var ang = d.angle();
  var result  = new vector( -Math.sin( ang ), Math.cos( ang ) );
  angVel  = angVel || this.angVelocity();

  return result.multiply( d.modulus() * angVel );
}

animElement.prototype.addMovementComponent = function( newMovement )	//Add a component to the last movement, or a movement if there isn't any
{
  if ( this.movementList.length == 0 )
  {
    this.addMovement( newMovement );
    this.doMovAction();
  }
  else
    this.movementList[ this.movementList.length -1 ].components.push( newMovement );
}

animElement.prototype.addMovement = function( newMovement, newSpeed )      //add movement next frame
{
  if ( newMovement && newMovement instanceof movement )
  {
    this.nextMovAction.add = true;
    this.nextMovAction.nextMovement = newMovement;
    this.nextMovAction.nextSpeed = newSpeed;
  }
}

animElement.prototype.replaceMovement = function( newMovement, newSpeed )    //replace movement next frame
{
  if ( newMovement && newMovement instanceof movement )
  {
    this.nextMovAction.replace = true;
    this.nextMovAction.nextMovement = newMovement;
    this.nextMovAction.nextSpeed = newSpeed;
  }
}

animElement.prototype.cancelMovements = function()       //cancels movements next frame
{
  if ( this.movementList[0] || this.nextMovAction.nextMovement )
    this.nextMovAction.cancel = true;
}

animElement.prototype.doMovAction = function( cancelAll )        //the instant that it is called, preformed scheduled actions synchronously
{
  if ( cancelAll != true )
    //CANCEL
    if ( this.nextMovAction.cancel )
    {
      if( this.movementList[0] )
	this.orientation = new vector ( this.movementList[0].direction );
      this.movementList = [];
    }
  //REPLACE
    else if ( this.nextMovAction.replace )
    {
      this.movementList = [];
      this.movementList.push( this.nextMovAction.nextMovement );
      this.speed = this.nextMovAction.nextSpeed || this.speed || this.movementList[0].speed || baseSpeed;   //use proposed speed, or current speed, or baseSpeed
    }
  //ADD
    else if ( this.nextMovAction.add )
    {
      this.movementList.push( this.nextMovAction.nextMovement );
      this.speed = this.nextMovAction.nextSpeed || this.speed || this.movementList[0].speed || baseSpeed;   //use proposed speed, or current speed, or baseSpeed
    }
  //HOUSEKEEPING
  this.nextMovAction.cancel  = false;
  this.nextMovAction.replace   = false;
  this.nextMovAction.add   = false;
  this.nextMovAction.nextMovement= undefined;
}

animElement.prototype.accelerate = function ( acceleration )
{
  this.nextAccAction.nextValue += acceleration || baseAccel;
  this.nextAccAction.active = true;
}

animElement.prototype.deccelerate = function ( decceleration )
{
  this.accelerate( -( decceleration || baseAccel ) );
}

animElement.prototype.doAccAction = function()
{
  if ( this.nextAccAction.active )
  {
    var newSpeed = this.speed + this.nextAccAction.nextValue;
    if ( newSpeed < 0 )
      newSpeed = 0;           //this will end and eliminate the movement from the list when move() is invoked
    this.speed = newSpeed;
    this.nextAccAction.nextValue = 0;
  }
}

animElement.prototype.finishMovement = function()
{
  if ( this.movementList.length > 0 )
    this.movementList.shift();
}

animElement.prototype.cancelRotation = function()        //next frame
{
  if ( this.rotation )
    this.rotation.cancel = true;
}

animElement.prototype.stop = function()          //stop all movement
{
  this.cancelMovements();
  this.cancelRotation();
}

animElement.prototype.stopInstant = function()          //cancels all motion INSTANTLY (use with care)
{
  if ( this.nextMovAction.nextMovement )
    this.orientation = new vector ( this.nextMovAction.nextMovement.direction );
  else if ( this.movementList[0] )
    this.orientation = new vector ( this.movementList[0].direction );

  this.doMovAction( true ); //cancel scheduled actions
  this.stop();
}

animElement.prototype.rotate = function( angle )
{
  this.angle += ( angle == undefined ) ? 5*Math.PI/180 : angle;
  this.angle = angleCheck( this.angle );  //between (-PI , PI]
}

animElement.prototype.rotateTo = function( angle )     //rotate to the desired angle (shortest way)
{
  if ( angle != undefined )
  {
    angle = angleCheck( angle );
    if ( this.angle != angle && ( !this.rotation || this.rotation && this.rotation.targetAngle != angle ) )
    {
      var incr = angle - this.angle;      //between [-2PI , 2PI]
      if ( ( incr > 0 && Math.abs( incr ) <= Math.PI ) || ( incr < 0 && Math.abs( incr ) > Math.PI ) )
        this.rotation = new rotation( 2*shiftAngle );     //turn right
      else
        this.rotation = new rotation( -2*shiftAngle );    //turn left
      this.rotation.targetAngle = angle;    //between [-PI , PI]
    }
  }
}

animElement.prototype.move = function ()       //update for each frame, for both movement and rotation
{
  //ELEMENT TRANSLATIONS
  if ( this.movementList[0] || this.nextMovAction.nextMovement != undefined )
  {
    this.doMovAction();
    if ( this.movementList[0] )
      if ( this.movementList[0].isFinished() )
	this.finishMovement();
      else
      {
	this.doAccAction();
	var incr = this.movementList[0].advance();
	this.pos = this.pos.add( incr );
	if ( this.movementList[0].oriented && ( incr.x != 0 || incr.y != 0 ) )
	  this.rotateTo( incr.angle() + Math.PI/2 );
      }
  }
  //ELEMENT ROTATIONS
  if ( this.rotation )
  {
    if ( this.rotation.cancel )
      this.rotation = undefined;
    else
    {
      var increment = this.rotation.advance();
      this.orientation.rotate( increment );
      this.rotate( increment );
      if ( this.rotation.targetAngle != undefined && ( Math.abs( this.rotation.targetAngle - this.angle ) < Math.abs( this.rotation.angVelocity )
	    || 2*Math.PI - Math.abs( this.rotation.targetAngle - this.angle ) < Math.abs( this.rotation.angVelocity ) ) )
      {
	this.orientation = new vector ( Math.cos( this.rotation.targetAngle - Math.PI/2 ), Math.sin( this.rotation.targetAngle - Math.PI/2 ) );
	this.setRotation( this.rotation.targetAngle );
	this.rotation = undefined;
      }
      if ( this.rotation && this.rotation.isFinished() )
	this.rotation = undefined;
    }
  }
}

animElement.prototype.moveTo = function ( destPos, append, curved )    ///convenience function to make the object move towards a position, and chain movements
{
  append = ( append == undefined ) ? false : append;
  curved = ( curved == undefined ) ? false : curved;

  if ( !append || this.movementList.length == 0 )
  {
    if( !curved )
      this.replaceMovement( new softMovement( this, destPos, baseSpeed ) );
    else
      this.replaceMovement( new curvedMovement( this, destPos, baseSpeed ) );
  }
  else
  {
    var direction = undefined;
    if ( this.movementList[ this.movementList.length-1 ] instanceof softMovement )
    {
      this.movementList[ this.movementList.length-1 ].cancelLand();
      direction = destPos.minus( this.movementList[ this.movementList.length-1 ].targetPos );
    }
    if( !curved )
    {
      var newMovement = new softMovement( this, destPos, baseSpeed );
      if ( direction )
	newMovement.direction = direction.direction();
      this.addMovement( newMovement );
    }
    else
      this.addMovement( new curvedMovement( this, destPos, baseSpeed ) );
  }
}

item.prototype = new animElement();    //new objects created with 'new' and this function will have this obj as their prototype to look up to
item.prototype.constructor = item;

function item( SVGNode, coordinates )   //an interactive animElement, with menu actions, and status (events).
{
  animElement.call( this, SVGNode, coordinates );
  if ( !SVGNode ) return;

  //MENU GROUP - contains the menu associated to this item to display on the front Panel
  this.menuIcons = [];
  this.menuGroup = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' );
  hideElement( this.menuGroup ); 
  frontPanel.SVGNode.appendChild( this.menuGroup );

  //Create a green circle surrounding the item, to indicate that it is selected
  this.circNode = document.createElementNS( 'http://www.w3.org/2000/svg' , 'circle' );
  this.circNode.setAttribute( 'id' , this.id + 'selectionCircle' );
  this.circNode.setAttribute( 'style' , 'fill:none;stroke:#00fe00' );
  hideElement( this.circNode ); 
  frontPanel.SVGNode.appendChild( this.circNode );

  //ACTIONS - options that appear in the context menu
  function newMenuIcon( item , action , icon )        //enclosure trick, to define actions with the variables of a loop
  {
    var act = function(){ action( selectedList, item ); };  //call the action on behalf of the character, over the object
    return new menuIcon( item, act, icon );
  }; 

  //parse the 'actions' attribute, and extract the default actions for this object
  var actions = this.SVGNode.getAttribute( 'actions' );
  if ( actions )
  {
    var actionList = actions.split( ',' );  //the actions are divided by commas ','
    for ( var i = 0 ; i < actionList.length ; i++ )
    {
      if ( actionList[i].indexOf( '=' ) == -1 ) //simple actions//TODO compound actions '+hacha=leña'
      {
	var act = actionDefs[ actionList[i] ];
	var ic  = iconDefs.createInstance( actionList[i], item );
	this.menuIcons.push( newMenuIcon( this, act, ic ) );    //do the enclosure trick to dynamicly define the action with the variables of the loop
      }
    }
  }

  //STATUS - status and event handlers that perform actions over the status and the item
  this.statusValues = [];
  this.evDispatcher = new eventDispatcher();
  var eventsGroup = document.getElementById( this.id + 'events' );
  if ( eventsGroup )
    for ( var child = eventsGroup.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.evDispatcher.addEventListener( new eventListener( child.getAttribute( 'type' ),
							      actionDefs[ child.getAttribute( 'action' ) ],
							       child.getAttribute( 'condition' ) ) );

  var statusValuesGroup = document.getElementById( this.id + 'status' );
  if ( statusValuesGroup )
    for ( var child = statusValuesGroup.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.addStatusItem( child );

  //COLLISIONS
  this.collisionRule = this.SVGNode.getAttribute( 'onCollision' ) || 'ignore';//default ignore collisions

  //ANIMATION	- an animation is a collection of movements and rotations for different objects that occur at the same time
  this.animations = [];			//collection of all animation sequences
  this.animIndex = undefined;		//current animation sequence being played

  var animationsGroup = document.getElementById( this.id + 'animations' );
  if ( animationsGroup )
    //CREATE THE ANIMATION SEQUENCES
    for ( var child = animationsGroup.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.animations.push( new animationSequence( child ) );
}

item.prototype.move = function ()       //update for each frame, for both movement and rotation
{
  animElement.prototype.move.call( this );

  //ELEMENT TRANSLATIONS
  if ( this.movementList[0] || this.nextMovAction.nextMovement != undefined )
  {
    //Move the menu and selection circle along with the object
    if ( !scene.followedObj )
    {
      this.placeCMenu();
      this.setSCircle();
    }
  }
  //STATUS UPDATE - if there is change
  var movState = this.getStatusValue( 'movement' );
  if ( ( this.movementList.length > 0 || this.rotation ) && movState == 'notmoving' )
    this.setStatusValue( 'movement' , 'moving' );
  else if ( !( this.movementList.length > 0 || this.rotation ) && movState == 'moving' )
    this.setStatusValue( 'movement' , 'notmoving' );
}

function animation( SVGNode )	//Collection of movements and rotations for different objects that occur at the same time. Correspond to <animation> tag
{
  this.id = SVGNode.getAttribute( 'id' );
  this.duration = SVGNode.getAttribute( 'duration' );
  this.objs = [];

  //READ THE <movement> nodes with movement and rotation info
  for ( var child = SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
  {
    //CREATE AN OBJECT FOR EACH DIFFERENT ANIMATION TARGET - if it doesn't exist
    var obj = undefined;
    for ( var i = 0 ; i < this.objs.length ; i++ )	//check if the object already exists
      if ( this.objs[i].id == child.getAttribute( 'id' ) )
      {
	obj = this.objs[i];
	i = this.objs.length;
      }
    if ( !obj )		//create a new object
    {
      var node = document.getElementById( child.getAttribute( 'target' ) );
      if ( node )
      {
	obj = new animElement( node );
	this.objs.push( obj );				//register the object
      }
    }

    //CREATE THE MOVEMENT FROM THE PARAMETERS
    if ( obj )
      for ( var i = 0 ; i < child.attributes.length ; i++ )
      {
	var params = child.attributes[i].value.split( ' ' );
	if ( child.attributes[i].name == 'rotation' )
	  obj.rotation = new rotation( params[0]*Math.PI/180, new vector( params[1], params[2] ) );
	else	//add movement components
	{
	  var mov = movementDefs[ child.attributes[i].name ];
	  if ( mov )
	    obj.addMovementComponent( new mov( obj, new vector( params[0], params[1] ), params[2],  false ) );	//create a movement, and add the next ones as components
	}
      }
  }
}    

function sequence( loop )	//generic sequence that changes every certain miliseconds (thought to be inherited)//TODO put somewhere else
{
  this.sequence = [];
  this.currentIndex = 0;
  this.timer = undefined;
  this.loop = loop || true;
}

sequence.prototype.goTo = function( index )	//the animation will be stop or start over if out of bounds.
{
  index = index == undefined ? 0 : index;
  if ( index < 0 || index >= this.sequence.length )
    if ( this.loop )
      this.currentIndex = 0;
    else
      mainTimer.removeCount( this.timer );
  else
    this.currentIndex = index;
  mainTimer.resetCount( this.timer, this.sequence[ this.currentIndex ].duration );
}

sequence.prototype.next = function( jump )
{
  jump = jump || 1;
  this.goTo( this.currentIndex + jump );
}

sequence.prototype.previous = function( jump )
{
  jump = jump || 1;
  this.goTo( this.currentIndex - jump );
}

sequence.prototype.play = function( intervalms, loop )
{
  var duration = this.sequence.length > 0 ? this.sequence[ this.currentIndex ].duration : undefined;
  intervalms = intervalms || duration;
  if( intervalms )
  {
    var that = this;
    this.timer = mainTimer.addCountDown( function(){ that.next() }, intervalms, loop );	//'true' means loop
  }
}

sequence.prototype.stop = function()
{
  this.currentIndex = 0;
  mainTimer.removeCount( this.timer );
}

animationSequence.prototype = new sequence();    //new objects created with 'new' and this function will have this obj as their prototype to look up to
animationSequence.prototype.constructor = animationSequence;

function animationSequence( SVGNode, removeAtEnd )	//Sequence of timed animations
{
  sequence.call( this, removeAtEnd );
  this.id = SVGNode.getAttribute( 'id' );
  this.initialStance = undefined;
  this.circular = SVGNode.getAttribute( 'circular' ) == 'yes';

  //LOAD THE ANIMATIONS
  for ( var child = SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    if ( child.nodeName == 'animation' )
    {
      var anim = new animation( child );
      this.sequence.push( anim );
    }
    else if ( child.nodeName == 'stance' )
      this.initialStance = new stance( child );

  //CIRCULAR - rewind at the end to the begining before starting over
  if ( this.circular )
    for ( var child = SVGNode.lastElementChild ; child != null ; child = child.previousElementSibling )
      if ( child.nodeName == 'animation' )
      {
	var anim = new animation( child );
	for ( var i = 0 ; i < anim.objs.length ; i++ )
	{
	  //Invert movement and rotation
	  if ( anim.objs[i].rotation )
	    anim.objs[i].rotation.angVelocity = -1*anim.objs[i].rotation.angVelocity;
	  for ( var j = 0 ; j < anim.objs[i].movementList.length ; j++ )
	    anim.objs[i].movementList[j].direction = anim.objs[i].movementList[j].direction.multiply( -1 );//TODO 'reverseMovement' prototype for other types of movement
	}
	this.sequence.push( anim );
      }
}

function stance( SVGNode )	//object that represents the position of certain parts of an object
{
  this.stanceItems = [];
  for ( var child = SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    this.stanceItems.push( new stanceItem( child ) );
}

function stanceItem( SVGNode )
{
  this.targetSVG = document.getElementById( SVGNode.getAttribute( 'target' ) );
  if ( !this.targetSVG ) return;
  this.angle = SVGNode.getAttribute( 'angle' ) || 0;
  this.pos = new vector( SVGNode.getAttribute( 'x' ) || 0 , SVGNode.getAttribute( 'y' ) || 0 );
  this.center = new vector( SVGNode.getAttribute( 'cx' ) || 0 , SVGNode.getAttribute( 'cy' ) || 0 );
  this.obj = new animElement( this.targetSVG );
}

//item.prototype.animateToStance = function( targetStance, duration )//TODO
//{
//  var newMov = new rectMovement( owner, targetStance.stanceItems[i].position, targetStance.stanceItems[i].position.modulus()/duration );
//  var newRot = new rotation( targetStance.stanceItems[i].angle/duration );
//}

item.prototype.setAnimation = function( newAnimID )
{
  for ( var i = 0 ; i < this.animations.length ; i++ )
    if ( this.animations[i].id == this.id + newAnimID )
    {
      this.cancelAnimations();
      this.animIndex = i;
      this.animations[ this.animIndex ].play( undefined, true );	//set the timer for changing the sequence
      this.setStance( this.animations[ this.animIndex ].initialStance );
      i = this.animations.length;
    }
}

item.prototype.cancelAnimations = function()	//stop any animation and bring the stance back to original
{
  if ( this.animIndex != undefined )
    this.animations[ this.animIndex ].stop();	//remove timer for animation sequence
  this.removeAnimationStance();		//reset transformations due to current animation
  this.animIndex = undefined;			//unset animation
}

item.prototype.removeAnimationStance = function()	//reset transformations due to current animation
{
  if ( this.animIndex != undefined )
  {
    var seq = this.animations[ this.animIndex ];

    for ( var j = 0 ; j < seq.initialStance.stanceItems.length ; j++ )
    {
      var stItem = seq.initialStance.stanceItems[j];
      stItem.obj.setPosition( new vector( 0 , 0 ) );
      stItem.obj.setRotation( 0 );
    }

    for ( var j = 0 ; j < seq.sequence.length ; j++ )
    {
      var anim = seq.sequence[j];
      for ( var i = 0 ; i < anim.objs.length ; i++ )
      {
	anim.objs[i].setPosition( new vector( 0 , 0 ) );
	anim.objs[i].setRotation( 0 );
      }
    }
  }
}

item.prototype.setStance = function( st )
{
  this.removeAnimationStance();
  for ( var i = 0 ; i < st.stanceItems.length ; i++ )
  {
    st.stanceItems[i].obj.setPosition( st.stanceItems[i].pos   );
    st.stanceItems[i].obj.setRotation( st.stanceItems[i].angle*Math.PI/180, st.stanceItems[i].center );
  }
}

animation.prototype.animate = function()
{
  for ( var i = 0 ; i < this.objs.length ; i++ )
  {
    this.objs[i].move();
    if ( this.objs[i].movementList[0] )
      this.objs[i].setPosition();
    if ( this.objs[i].rotation )
      this.objs[i].setRotation();
  }
}

item.prototype.animate = function()
{
  if ( this.animations.length > 0 && this.animIndex != undefined )
  {
    var seq = this.animations[ this.animIndex ];
    seq.sequence[ seq.currentIndex ].animate();
  }
}

//
function spriteAnim( SVGNode )//TODO attribute telling the miliseconds on each photogram
{//TODO bouncing option, to go back and forth in a loop
//  this.name = SVGNode.getAttribute( 'name' );
//  this.currentIndex = 0;
//  this.timer = undefined;
//  this.removeAtEnd = removeAtEnd || true;
//
//  this.sequence = [];
//  for ( var child = SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
//    this.sequence.push( child );
//  this.sequence[0].setAttribute( 'display' , 'block' );
}
/////////////TODO review all these functions

spriteAnim.prototype.remove = function()		//remove the text nodes and the timer
{
  for ( var i = 0 ; i < this.sequence.length ; i++ )
    this.sequence[ i ].remove();
  mainTimer.removeCount( this.timer );
}

//////////////////////////////

function statusValue( SVGNode, rootObj, evDispatcher ) //a value that is part of the status of an element
{							//an event is fired when it changes and there is value control
  this.rootObj = rootObj;
  this.name = SVGNode.getAttribute( 'name' );
  this.type = SVGNode.getAttribute( 'type' ) || 'number';
  this.value = SVGNode.getAttribute( 'value' );
  this.min = SVGNode.getAttribute( 'minValue' );
  this.max = SVGNode.getAttribute( 'maxValue' );

  this.evDispatcher = evDispatcher;
  this.validators = [];//array of functions that will sequencially control the change of a value

  //INITIALIZE INDICATORS
  for ( var child = SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
  {
    if ( child.tagName == 'bar' )
      this.bind( new bar( child.getAttribute( 'maxValue' ), child.getAttribute( 'color' ),
			  child.getAttribute( 'pos' ), child.getAttribute( 'height' ),
			  child.getAttribute( 'width' ) ) );
    else if ( child.tagName == 'txtIndicator' )
      this.bind( new text( this.value, child.getAttribute( 'style' ),
			new vector( child.getAttribute( 'x' ), child.getAttribute( 'y' ) ) ) );
  }

  //DEFAULT FIRST VALIDATOR, if 'minValue' and 'maxValue' limits have been defined
  if ( this.min != undefined || this.max != undefined )
    this.validators[0] = function( newVal )
    {
      if ( this.max != undefined && newVal > this.max )
	return parseFloat( this.max );
      else if ( this.min != undefined && newVal < this.min )
	return parseFloat( this.min );
      else
	return newVal;
    }
}

statusValue.prototype.setValue = function( value )
{
  //Chain-validate the new value to meet the restrictions and set the final value
  if ( this.validators.length == 0 )
    this.value = value;
  else
    for ( var i = 0 ; i < this.validators.length ; i++ )
      this.value = this.validators[i]( value );
  //Fire value change event
  if ( this.evDispatcher && this.rootObj )
    this.evDispatcher.addEvent( new event( this.name, this.value, this.rootObj ) );
}

item.prototype.addStatusItem = function( SVGNode )
{
  this.statusValues.push( new statusValue( SVGNode, this, this.evDispatcher ) );
}

item.prototype.setStatusValue = function( statusName, value )
{
  for ( var i = 0 ; i < this.statusValues.length ; i++ )
    if ( this.statusValues[i].name == statusName )
      this.statusValues[i].setValue( value );
}

item.prototype.getStatusValue = function( statusName )
{
  var result = undefined;
  for ( var i = 0 ; i < this.statusValues.length ; i++ )
    if ( this.statusValues[i].name == statusName )
      result = this.statusValues[i].value;
  return result;
}

function menuIcon ( obj, action, icon, condition )
{
  this.icon  = icon;  //icon is of the 'icon' type
  this.condition = condition; //determines if the menu action is available
  this.action = action;
  this.obj   = obj;

  var that = this;
  var f = function()
  {
    if ( that.condition == undefined || that.condition() )
    {
      that.action();
      that.obj.hideCMenu();
    }
  };
  this.icon.SVGNode.addEventListener( 'click', f , false );
}

item.prototype.setCMenu = function( menuIcons, radius, itemSize ) //layout the menu icons in a circle
{
  itemSize  = itemSize || defItemSize;
  radius  = radius || 1.5 * parseFloat( this.circNode.getAttribute( 'r' ) ) + itemSize;
  menuIcons = menuIcons || this.menuIcons;
  var delta = 2*Math.PI/menuIcons.length;

  //Empty menuGroup
  for ( var child = this.menuGroup.firstElementChild ; child != null ; child = child.nextElementSibling )
    this.menuGroup.removeChild( child );

  //Place the items in the menu group, properly scaled
  for ( var i = 0 ; i < menuIcons.length ; i++ )
  {
    var itemGroup = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' ); //group for scaling
    itemGroup.appendChild( menuIcons[i].icon.SVGNode );

    //Scale each icon to fit the tile
    var itemWidth  = parseFloat( menuIcons[i].icon.SVGNode.getAttribute( 'width'  ) );
    var itemHeight = parseFloat( menuIcons[i].icon.SVGNode.getAttribute( 'height' ) );
    var scaleFactor = itemSize / Math.max( itemWidth, itemHeight );
    itemGroup.setAttribute( 'transform', 'scale( ' + scaleFactor + ',' + scaleFactor + ')' );

    menuIcons[i].icon.SVGNode.setAttribute( 'x' , ( radius * Math.cos( i * delta - Math.PI/2 ) - itemWidth/2  )/scaleFactor );
    menuIcons[i].icon.SVGNode.setAttribute( 'y' , ( radius * Math.sin( i * delta - Math.PI/2 ) - itemHeight/2 )/scaleFactor );
    this.menuGroup.appendChild( itemGroup );
  }
}

item.prototype.placeCMenu = function( pos )//center the circular menu at a certain position
{
  pos = pos || scene.toScreen( this.pos );
  this.menuGroup.setAttribute( 'transform', 'translate( ' + ( pos.x - this.width/2 * scene.viewBoxWidth/window.innerWidth ) + ',' + ( pos.y - this.height/2 * scene.viewBoxHeight/window.innerHeight ) + ')' );
}

item.prototype.showCMenu = function()
{
  this.menuGroup.removeAttribute( 'display' );
  this.setSCircle();
  this.circNode.setAttribute( 'display' , 'block' );
}

item.prototype.setSCircle =  function()
{
  var screenPos = scene.toScreen( this.pos );
  this.circNode.setAttribute( 'cx' , screenPos.x );
  this.circNode.setAttribute( 'cy' , screenPos.y );
  this.circNode.setAttribute( 'r' , Math.max( this.width, this.height )/scene.viewBoxHeight*window.innerHeight/1.75 );
}

item.prototype.hideCMenu = function()
{
  hideElement( this.menuGroup ); 
  hideElement( this.circNode ); 
}

item.prototype.toggleCMenu = function()
{
  if ( this.menuGroup.getAttribute( 'display' ) )
    this.showCMenu();
  else
    this.hideCMenu();
}

item.prototype.mousedown = function( event )
{
  lockEvent( event );
  if ( event.button == '2' )    //SHOW MENU
  {
    if ( this.menuGroup.getAttribute( 'display' ) )
    {
      for ( var i = 0 ; i < itemList.length ; i++ )
        itemList[i].hideCMenu();
      this.setCMenu();
      this.placeCMenu();
      this.showCMenu();
    }
    else
      this.hideCMenu();
  }
}

object.prototype = new item();    //new objects created with 'new' and this function will have this obj as their prototype to look up to
object.prototype.constructor = object;

function object( SVGNode, coordinates )   //inert item that also has physic attributes
{
  item.call( this, SVGNode, coordinates );
  if ( !SVGNode ) return;

  //PHYSIC ATTRIBUTES
  this.mass = parseFloat( this.SVGNode.getAttribute( 'mass' ) ) || Infinity;
  this.momInertia = parseFloat( this.SVGNode.getAttribute( 'momentInertia' ) ) || this.momentInertia();
  this.momInertia  = ( this.momInertia <= 0 ) ? Infinity : this.momInertia; //negative (zero) values mean Infinity
  this.collisionRule = this.SVGNode.getAttribute( 'onCollision' ) || 'elastic';//default elastic collisions
}

object.prototype.momentInertia = function ()
{
  var sum = 0;
  for ( var i = 0 ; i < this.parts.length ; i++ )
    sum += this.parts[i].pos.sqModulus() + this.parts[i].shape.areaInertia(); //parallel axes theorem centered in the object's axes
  return sum*this.mass;   //the density is assumed uniform
}

object.prototype.setSelected = function( selected )
{
  selected = ( selected == undefined ) ? true : selected ;

  if ( selected && !this.selected )   //here it goes, some closure madness xDDDDD
  {
      document.addEventListener( 'keydown', this.keyHandler, false );
      document.addEventListener( 'keyup', this.keyStopHandler, false );
      this.selected = true;
      selectedList.push( this );
  }
  if ( !selected && this.selected )
  {
      document.removeEventListener( 'keydown', this.keyHandler, false );
      document.removeEventListener( 'keyup', this.keyStopHandler, false );

      selectedList.removeElement( this );
      this.selected = false;
  }
  scene.unfollow();
  scene.setMaxZoom();
}

object.prototype.toggleSelected = function()
{
      if ( this.selected )
  this.setSelected( false );
      else
  this.setSelected( true );
}

function selectElements( option, list )
{
  list = list || objectList;
  option = ( option == undefined ) ? true : option;
  for ( var i = 0 ; i < list.length ; i++ )
      list[i].setSelected( option );
}

being.prototype = new object();   //new objects created with 'new' and this function will have this obj as their prototype to look up to
being.prototype.constructor = being;

function being( SVGNode, coordinates )      //animated object that has behaviours
{
  object.call( this, SVGNode, coordinates );
  if ( !SVGNode ) return;

  ///STATUS
  this.behaviours = [];
  this.complexBehaviours= [];
  this.orders   = [];

  //CONVERSATION
  this.rootConversNode = [];
  var conversGroup = document.getElementById( this.id + 'conversations' );
  if ( conversGroup )
    for ( var child = conversGroup.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.rootConversNode.push( new conversationTreeNode( child ) );
}

character.prototype = new being();    //new objects created with 'new' and this function will have this obj as their prototype to look up to
character.prototype.constructor = character;    //we want to state that the constructor of 'character' objects is character(), not being()

function character( SVGNode, coordinates )          ///'being' element controlable by the user, with inventory
{
  being.call( this, SVGNode, coordinates );
  if ( !SVGNode ) return;

  ///STATUS
  this.selected  = false;

  //INVENTORY
  this.inventory = [];
  this.invGroup = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' );
  frontPanel.SVGNode.appendChild( this.invGroup );

}

character.prototype.drawInventory = function( pos, width, height, numItemsRow, leftToRight ) //Draw the inventory on the panel
{
  pos = pos || new vector( window.innerWidth/2 , 0 );
  width = width || window.innerWidth/2;
  height = height || window.innerHeight;//TODO use for cropping
  leftToRight = ( leftToRight == undefined ) ? false : leftToRight;
  numItemsRow = numItemsRow || defNumItemsRow;
  var itemSize = width/numItemsRow;

  var row = 0;
  var col = 0;

  for ( var child = this.invGroup.firstElementChild ; child != null ; child = child.nextElementSibling )
  {
    //Scale each icon to fit the tile
    var childWidth  = parseFloat( child.firstElementChild.getAttribute( 'width'  ) );
    var childHeight = parseFloat( child.firstElementChild.getAttribute( 'height' ) );
    var scaleFactor = itemSize / Math.max( childWidth, childHeight );
    child.setAttribute( 'transform', 'scale( ' + scaleFactor + ',' + scaleFactor + ')' );

    if ( leftToRight )
      var place = pos.x + col * itemSize;
    else
      var place = pos.x + width - itemSize - col * itemSize;

    //Place the icon
    child.firstElementChild.setAttribute( 'x' , place/scaleFactor );
    child.firstElementChild.setAttribute( 'y' , ( pos.y + row * itemSize )/scaleFactor );
    if ( col == numItemsRow - 1 )
    {
      row++;
      col = 0;
    }
    else
      col++;
  }
}

function pickItem ( chList , it )   //add an item to the inventory, and remove it from the game
{
  scene.removeElement( it );
  chList[0].inventory.push( it );

  var itemGroup = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' ); //group for scaling
    itemGroup.appendChild( it.SVGNode );
  chList[0].invGroup.appendChild( itemGroup );
  chList[0].drawInventory();

  mainEventDispatcher.addEvent( new event( 'pick', chList[0].id + it.id, chList[0], it ) );
}

function lookItem( chList, it, duration )     //print the text of the 'description' attribute on the SVG node of the object
{
  duration = duration || textDuration;
  var txt = new textSequence( it.SVGNode.getAttribute( 'description' ) || 'No hay nada interesante que ver' ,
      							lookStyle,
							scene.toScreen( it.pos ) );
  txt.play( duration );
}

function talk( chList, it )		//Shows the conversation corresponding between acting and acted characters
{
  var conversation = undefined;

  //check for each conversation available on the acted character the first one for an acting character
  if ( it.rootConversNode.length > 1 )
    for ( var j = 0 ; j < it.rootConversNode.length ; j++ )
      for ( var i = 0 ; i < selectedList.length ; i++ )
	//the id is of the form 'actedcharacterIDactingCharacterID'
	if ( it.rootConversNode[j].id.indexOf( it.id + selectedList[i].id ) != -1 )
	{
	  conversation = it.rootConversNode[j];
	  j = it.rootConversNode.length;
	  i = selectedList.length;
	}
 
  //default to first one if no match
  if ( !conversation && it.rootConversNode.length > 0 )
    conversation = it.rootConversNode[0];

  if ( conversation )
    conversation.show();
}

function damage( event )
{
  var damageFactor = 10;
  var collisionInfo = event.args[0];
  var beings = [];
  if ( collisionInfo.inObj instanceof being )
    beings.push( collisionInfo.inObj );
  if ( collisionInfo.outObj instanceof being )
    beings.push( collisionInfo.outObj );

  for ( var i = 0 ; i < beings.length ; i++ )
  {
    var life = beings[i].getStatusValue( 'life' );
    if ( life )
    { 
      var newLife = life - damageFactor;
      beings[i].setStatusValue( 'life' , newLife );
    }
  }
}

function setAnimation( event )//set to the animation with the same name as the value of the movement statusValue
{
  var obj = event.args[0];
  obj.setAnimation( obj.getStatusValue( 'movement' ) );	
}

character.prototype.mousedown = function( event )
{
  lockEvent( event );
  object.prototype.mousedown.call( this, event );
  if ( event.button == '0' ) 
  {
    if ( event.ctrlKey )    //TOGGLE SELECTION
    {
      if ( !( selectedList.length == 1 && selectedList[0] === this ) )  //don't de-select the last one
	this.toggleSelected();
    }
    else
      if( event.shiftKey )    //SELECT ALL
	selectElements();
      else      		  //SELECT ONLY THIS ELEMENT
      {
	selectElements( false );
	this.setSelected();
      }
  }
}

character.prototype.key = function( event )
{
  if ( event.keyCode == 75 || event.keyCode == 87 || event.keyCode == 83 || event.keyCode == 68 || event.keyCode == 65 )
    this.keyboardControlOrders(); //orders now come from keyboard

  if ( event.keyCode == 27 ) ///'esc' CANCEL MOVEMENTS
    this.stop();

  else if ( event.keyCode == 84 ) ///'t' FORWARDS
    this.replaceMovement( new movement( this, this.orientation ) );

  else if ( event.keyCode == 71 ) ///'g' BACKWARDS
  {
      this.replaceMovement( new movement( this, this.orientation.multiply( -1 ) ) );
      this.orientation = this.orientation.multiply( -1 );
  }
    ////////////
  else if ( event.keyCode == 87 ) ///'w' UP
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 1 );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );

    }
    else
      this.replaceMovement( new arrowMovement( this, 1 ) );
  }
  else if ( event.keyCode == 83 ) ///'s' DOWN
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 2 );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );

    }
    else
      this.replaceMovement( new arrowMovement( this, 2 ) );
  }
  else if ( event.keyCode == 68 ) ///'d' RIGHT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 3 );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );

    }
    else
      this.replaceMovement( new arrowMovement( this, 3 ) );
  }
  else if ( event.keyCode == 65 ) ///'a' LEFT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 4 );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );
    }
    else
      this.replaceMovement( new arrowMovement( this, 4 ) );
  }
  ///////////////////////////////////////////////////////////////

  else if ( event.keyCode == 73 ) ///'i' ACCELERATE AND BEGIN 'CAR MODE'
  {
    this.cancelAnimations();//TODO
    //if ( !this.movementList[0] )
    //{
      //this.keyboardControlOrders();
      //this.addMovement( new carMovement( this, this.orientation ) );
    //}
    //this.accelerate();
  }
  else if ( event.keyCode == 75 ) ///'k' DECCELERATE
    this.deccelerate();

  else if ( event.keyCode == 76 || event.keyCode == 72 ) ///'l' STIR RIGHT
  {
    if ( this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 1;
    this.rotation = new rotation( shiftAngle );
  }
  else if ( event.keyCode == 74 || event.keyCode == 70  ) ///'j' STIR LEFT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 2;
    this.rotation = new rotation( -shiftAngle );
  }

  else if ( event.keyCode == 32 ) ///'space' GO RANDOM
  {
    if ( !this.movementList[0] )
    {
      var newMovement = new movement( this, this.orientation );
      newMovement.randomCurv();
      this.addBasicInfBehaviour( newMovement );
    }
//     else
//       this.movementList[0].randomCurv();
    //  this.movementList[0].randomSpeed();
    //this.movementList[0].randomOrient();
  }
  else if ( event.keyCode == 67 ) ///'c' ADD CIRCLE COMPONENT
  {
    if ( !this.movementList[0] )
      this.addMovement( new circleMovement( this ) );
    else
      this.movementList[0].components.push( new circleMovement( this ) );
  }
  else if ( event.keyCode == 90 ) ///'z' FOCUS ELEMENT IN SCREEN VIEW
    scene.focus( this );

  else if ( event.keyCode == 88 ) ///'x' TOGGLE 'FOLLOW ELEMENT WITH CAMERA', CENTERED WITH 'CTRL'
  {
    if ( scene.followedObj !== this )
      scene.follow( this, event.ctrlKey );
    else
      scene.unfollow();
  }
  else if ( event.keyCode == 8 ) //'backspace' SPIN (ACCELERATE). COUNTER CLOCKWISE WITH 'SHIFT' (DECCELERATE)
  {
    if ( !event.shiftKey )
    {
      if ( this.rotation )
  this.rotation.accelerate( shiftAngle );
      else
  this.rotation = new rotation( 3*shiftAngle , undefined, frictionMoment );
    }
    else
    {
      if ( this.rotation )
  this.rotation.accelerate( -shiftAngle );
      else
  this.rotation = new rotation( -3*shiftAngle , undefined, frictionMoment );
    }
  }
}

character.prototype.keyStop = function( event )
{
  if ( event.keyCode == 84 || event.keyCode == 71 )
    this.stop();
  else if ( this.movementList[0] )
  {
    if ( event.keyCode == 87 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 1, false );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );
    }
    if ( event.keyCode == 83 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 2, false );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );
    }
    if ( event.keyCode == 68 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 3, false );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );
    }
    if ( event.keyCode == 65 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 4, false );
      this.rotateTo( this.movementList[0].direction.angle() + Math.PI/2 );
    }
    if ( event.keyCode == 73 || event.keyCode == 75 )
      this.nextAccAction.active = false;
    if ( (  event.keyCode == 74 || event.keyCode == 76  ) && this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 0;
  }
  if (  event.keyCode == 74  || event.keyCode == 76  || event.keyCode == 70  || event.keyCode == 72 )
    this.rotation = undefined;
}


//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function behaviour( firstState, code, priority, unique )  //object with a variable state that dictates the movement behaviour of the element
{
  this.state = ( firstState == undefined ) ? new BState() : firstState;
  this.priority = ( priority == undefined ) ? 1 : priority;//'0' means behaviour only works if it's alone, while very big values override more other behaviours
  this.code = code || '??';
  this.count = 1;
  this.unique = ( unique == undefined ) ? false : unique; //a 'unique' behaviour overrides others of the same kind
}

function BState( move, update, priority, time )   //state that can contain triggers to other states, and defines a movement
{
  this.triggers = [];
  this.movement = move; //undefined means no movement
  this.priority = priority || 0;
  this.update = update; //function to alter priority, movement or triggers as required by the situation. Called repeatedly while in the state
  this.inicTime = ( time == undefined ) ? Infinity : time;  //determines how many frames the behaviour lasts in this state before being disposed of
  this.timer = this.inicTime;
}

function trigger ( fireFunction, nextState, priority )  //transition between states, activated by a function according to certain conditions
{
  this.fire = fireFunction; //performs actions, and returns 'true' if the trigger is to fire. 'undefined' means this trigger will never execute.
  this.nextState = nextState; //undefined means itself
  this.priority = priority || 1;//integer number, 1 being the lowest. On overlapping conditions, priorities will decide which one to fire
}

BState.prototype.addTrigger = function( testFunction, nextState, priority ) //convenience function to create and add a new trigger for this state
{
  this.triggers.push( new trigger( testFunction, nextState, priority ) );
}

being.prototype.updateBehaviours = function( bhList )   //checks if any trigger needs to be executed and changes the state accordingly
{
  bhList = bhList || this.behaviours;
  var result = false;
  if ( bhList.length > 0 )
    for ( var j = 0 ; j < bhList.length ; j++ )
    {
      if ( bhList[j].state.timer <= 0 )
  bhList.splice( j, 1 );  //remove the behaviour if it expired
      else
      {//UPDATE STATE - the weight of the components to a movement depends on the priority of the behaviour and also the priority of the state
  bhList[j].state.timer--;
  if ( bhList[j].state.update )
    bhList[j].state.update();
  if ( bhList[j].state.movement )
    bhList[j].state.movement.weight = bhList[j].priority + bhList[j].state.priority;

  //LOOK FOR HIGHEST PRIORITY TRIGGER
  var aTrigger = undefined;
  var maxPriority = -Infinity;
  for ( var i = 0 ; i < bhList[j].state.triggers.length ; i++ )
    if ( maxPriority < bhList[j].state.triggers[i].priority
      && bhList[j].state.triggers[i].fire != undefined
      && bhList[j].state.triggers[i].fire() == true )
    {
      aTrigger = bhList[j].state.triggers[i];
      maxPriority = bhList[j].state.triggers[i].priority;
      result = true;
    }
  //EXECUTE (first) HIGH PRIORITY TRIGGER
  if ( aTrigger && aTrigger.nextState )   //undefined 'nextState' means the current state is not abandoned
  {
    bhList[j].state = aTrigger.nextState;
    bhList[j].state.timer = bhList[j].state.inicTime;
  }
      }
    }
  return result;
}

being.prototype.doBehaviours = function()   //executes the new movement if the state changed
{
  //fire triggers and set movements
  var bhList = this.orders[0] ? this.orders[0].bhList : this.behaviours;  //if there are orders, execute them instead of other behaviours
  var move = false;
  for ( var i = 0 ; i < bhList.length ; i++ )
    if ( bhList[i].state.movement )
    {
      bhList[i].state.movement.components = []; //only permit simple movements for each behaviour
      if ( !move )
  this.replaceMovement( bhList[i].state.movement );
      else
  this.nextMovAction.nextMovement.components.push( bhList[i].state.movement );
      move = true;
    }
    if ( !move && bhList.length > 0 && this.state != 0 )
      this.stop();
  this.updateBehaviours( this.orders[0] ? this.orders[0].bhList : undefined );  // executes behaviours related to the orders, or if no orders, all normal behaviours
  this.updateComplexBehaviours( this.orders[0] ? this.orders : undefined );
}

being.prototype.addBehaviour = function( bh )     //adds a behaviour only if it did'nt exist already
{
  var found = false;
  for ( var i = 0 ; i < this.behaviours.length ; i++ )
  {
    if ( bh.unique )
    {
      if ( this.behaviours[i].code.slice( 0, 2 ) == bh.code.slice( 0, 2 ) )
      {
  this.behaviours.splice( i, 1 );
  i--;
      }
    }
    else if ( this.behaviours[i].code == bh.code )
    {
      this.behaviours[i].count++;
      found = true;
    }
  }
  if ( !found )
    this.behaviours.push( bh );
}

being.prototype.removeBehaviour = function( bh )
{
  for ( var i = 0 ; i < this.behaviours.length ; i++ )
    if ( this.behaviours[i].code == bh.code )
      if ( this.behaviours[i].count > 1 )
  this.behaviours[i].count--;
      else
  this.behaviours.splice( i, 1 );
}

being.prototype.makeBasicInfBehaviour = function( move, code, priority, time )  //creates a one-state behaviour that repeats everytime a movement is finished
{
  var state = new BState( move, undefined, undefined, time ); //create a state with a corresponding movement
  var that = this;
  return new behaviour( state, code, priority );
}

being.prototype.addBasicInfBehaviour = function( move, code, priority, time ) //creates a one-state behaviour that repeats everytime a movement is finished
{
  this.addBehaviour( this.makeBasicInfBehaviour( move, code, priority, time ) );
}

being.prototype.increaseBasicInfBehaviour = function( move, code, time, incr )  //increases priority or creates behaviour
{
  if ( !this.increaseBehaviourPriority( code, incr ) )
    this.addBasicInfBehaviour( move, undefined, time, code );
}

being.prototype.addBasicBehaviour = function( move, time, priority, code )  //creates a one-state behaviour that is removed on the idle state (after a 'time')
{
  var state0 = new BState( move );  //create a state with a corresponding movement
  var state1 = new BState( undefined, undefined, undefined, ( time == undefined ) ? 0 : time );   //idle state, duration '0'

  var that = this;
  state0.addTrigger( function(){ return that.state == 0 } , state1 );   //add a condition to re-initiate the state/movement: if the being is idle
  this.addBehaviour( new behaviour( state0, code, priority ) );
  this.setStatusValue( 'movement' , 'moving' );
}

being.prototype.increaseBasicBehaviour = function( move, code, time, incr ) //increases priority or creates behaviour
{
  if ( !this.increaseBehaviourPriority( code, incr ) )
    this.addBasicBehaviour( move, time, undefined, code );
}

being.prototype.addChaseBehaviour = function( target, distance, code, basePriority )//chases the target if it gets too far, and flees from it if it gets too close
{
  code = code || "CH-" + target.id;
  basePriority = basePriority || 1;
  var state0 = new BState();            //base state - do nothing
  var state1 = new BState( new chaseMovement( this, target ) ); //chase target
  var that = this;
  state0.addTrigger( function() { return !that.isCloserTo( target.pos, distance ); }, state1 ); //if too far, chase
  state1.addTrigger( function() { return  that.isCloserTo( target.pos, distance ); }, state0 )  //if close enough, idle
  this.addBehaviour( new behaviour( state0 , code, basePriority ) );
}

being.prototype.addAvoidBehaviour = function( target, distance, code, maxPriority, basePriority ) //flees from the target if it gets too close
{
  code = code || "AE-" + target.id;
  var that = this;
  basePriority = basePriority || 0;
  maxPriority = maxPriority || 4;
  distance = distance || 2*( Math.max( that.width, that.height ) + Math.max( target.width, target.height ) );
  var state0 = new BState();  //base state - do nothing
  var state1 = new BState( new fleeMovement( this, target ) ,//state - flee from target.

          // Fleeing priority goes linearly from '0' when far, to 'maxPriority' when too close
          function(){
            this.priority = maxPriority*( 1 - that.distanceTo( target.pos )/distance );
            this.priority = this.priority < 0 ? 0 : this.priority; }
        );
  state0.addTrigger( function() { return  that.isCloserTo( target.pos, distance ); }, state1 ); // if too close, flee
  state1.addTrigger( function() { return !that.isCloserTo( target.pos, distance ); }, state0 ); //if far enough, idle
  this.addBehaviour( new behaviour( state0, code, basePriority ) );
}

being.prototype.makeDetourBehaviour = function( obj, distance, target, code, maxPriority, basePriority )  //moves away from and around an obstacle
{
  var that = this;
  code = code || "DE-" + obj.id;
  distance = distance || 2*Math.max( that.width, that.height );
  basePriority = basePriority || 0;
  maxPriority = maxPriority || 4;
  var state0 = new BState();  //base state - do nothing
  var state1 = new BState( new detourMovement( this, obj, target ) ,//state - move away from and arround the closest wall
          function(){
            this.movement.updateDir( target );  //set a direction to avoid the obstacle
            // Priority goes linearly from '0' when far, to 'maxPriority' when too close
            this.priority = maxPriority*( 1 - obj.distanceFromFaceTo( that.pos )/distance );
            this.priority = this.priority < 0 ? 0 : this.priority; }
        );
  state0.addTrigger( function() { return obj.distanceFromFaceTo( that.pos ) < distance; }, state1 );  //if too close, detour
  state1.addTrigger( function() {
          if ( obj.distanceFromFaceTo( that.pos ) > distance )
          {
      state1.movement.clockwise = undefined;//forget the old direction
      return true;
          }
          return false;
      ; }
      , state0 ); //if far enough, idle
  return new behaviour( state0, code, basePriority );
}

being.prototype.addDetourBehaviour = function( obj, distance, target, code, maxPriority, basePriority ) //moves away from and around an obstacle
{
  this.addBehaviour( this.makeDetourBehaviour( obj, distance, target, code, maxPriority, basePriority ) );
}

being.prototype.addDetourAllBehaviour = function( dist, target, code, maxPriority, basePriority ) //moves away from and around an obstacle
{
  for ( var j = 0 ; j < scene.sceneItems.length ; j++ )
    this.addDetourBehaviour( scene.sceneItems[j], dist, target, code, maxPriority, basePriority );
}

being.prototype.addAvoidObstacleBehaviour = function( obj, distance, code, maxPriority, basePriority )  //flees from an obstacle
{
  code = code || "AO-" + obj.id;
  var that = this;
  basePriority = basePriority || 0;
  maxPriority = maxPriority || 4;
  distance = distance || 2*Math.max( that.width, that.height );
  var state0 = new BState();  //base state - do nothing
  var state1 = new BState( new movement( this ) ,//state - move away from the closest wall

          function(){
            this.movement.direction = obj.closestNormalTo( that.pos );
            // Priority goes linearly from '0' when far, to 'maxPriority' when too close
            this.priority = maxPriority*( 1 - obj.distanceFromFaceTo( that.pos )/distance );
            this.priority = this.priority < 0 ? 0 : this.priority; }
        );
  state0.addTrigger( function() { return obj.distanceFromFaceTo( that.pos ) < distance; }, state1 );  //if too close, flee
  state1.addTrigger( function() { return obj.distanceFromFaceTo( that.pos ) > distance; }, state0 );  //if far enough, idle
  this.addBehaviour( new behaviour( state0, code, basePriority ) );
}

being.prototype.addGoToBehaviour = function( destPos, code, basePriority )  //the behaviour repeatedly goes to the destination and then is removed
{
  this.addBehaviour( this.makeGoToBehaviour( destPos, code, basePriority ) );
  this.setStatusValue( 'movement' , 'moving' );
}

being.prototype.makeGoToBehaviour = function( destPos, code, maxPriority, basePriority )  //the behaviour repeatedly goes to the destination and then is removed
{
  code = code || 'GO-'+ destPos.x +','+ destPos.y ;
  basePriority = basePriority || 1;
  maxPriority = maxPriority || 10;
  var that = this;

  var state0 = new BState( new /*soft*/rectMovement( that, destPos, baseSpeed ) ,     //create a state with a corresponding movement TODO soft??
          function(){
            // Priority goes linearly from '0' when far, to 'maxPriority' when too close
            var dist= that.distanceTo( destPos );
            if ( dist < 50 )
        this.priority = maxPriority; }
        );

  var state1 = new BState( undefined, undefined, undefined, 0 );    //idle state, duration '0'
  state0.addTrigger( function() { return that.isCloserTo( destPos, 1 )/*softMovement.prototype.isFinished.call( state0.movement );*/ }, state1 ); //on arrival, stop
  return new behaviour( state0, code, basePriority, true );
}

being.prototype.addKeepPositionBehaviour = function( code, basePriority ) //always tries to stay on that position
{
  code = code || 'KP';
  basePriority = basePriority || 1;
  var state = new BState( move, undefined, undefined, time );
  this.addBehaviour( new behaviour( state, code, priority ), true );
}

//function groupBehaviour ( objList, init, refresh ) //TODO
// {
//   this.objList = objList || beingList;
//   this.refresh = refresh;
//   init.call( this );
// }

function complexBehaviour ( bhList, finishCheck )   //compound behaviour: mix of basic behaviours with an extra condition for finalization
{             //the set of behabiours is added and removed together consistently
  this.bhList = bhList || [];
  this.finishCheck = finishCheck || function(){ return this.bhList[0].state.timer == 0; };  //default, when the first behaviour is to be removed
}

being.prototype.addComplexBehaviour = function( cbh, cbhList )
{
  cbhList = cbhList || this.complexBehaviours;
  cbhList.push( cbh );
  for ( var i = 0 ; i < cbh.bhList.length ; i++ )
    this.addBehaviour( cbh.bhList[i] );
}

being.prototype.removeComplexBehaviour = function( cbh, cbhList )
{
  cbhList = cbhList || this.complexBehaviours;
  cbhList.removeElement( cbh );
  for ( var i = 0 ; i < cbh.bhList.length ; i++ )
    this.removeBehaviour( cbh.bhList[i] );
}

being.prototype.removeAllComplexBehaviours = function( cbhList )//TODO da error en la consola, check!
{
  cbhList = cbhList || this.complexBehaviours;
  for ( var i = 0 ; i < cbhList.length ; i++ )
    this.removeComplexBehaviour( cbhList[i], cbhList );
}

being.prototype.updateComplexBehaviours = function( cbhList ) //removes c. behaviours components that have expired ( from any list, or from all behaviours )
{
  cbhList = cbhList || this.complexBehaviours;
  for ( var i = 0 ; i < cbhList.length ; i++ )
    if ( cbhList[i].finishCheck() )
      this.removeComplexBehaviour( cbhList[i], cbhList );
}

being.prototype.keyboardControlOrders = function()
{
  var that = this;
  this.removeAllComplexBehaviours( this.orders );
  this.addComplexBehaviour( new complexBehaviour( undefined, function(){ return that.state == 0; } ), this.orders );
}

being.prototype.addGoToCBehaviour = function( destPos, order )    //the element goes to the location, while avoiding obstacles
{
  order = ( order == undefined ) ? false : order; //add to the order List
  var cbhList = order ? this.orders : undefined;
  var bhList = [];
  bhList.push( this.makeGoToBehaviour( destPos ) );
  for ( var j = 0 ; j < scene.sceneItems.length ; j++ )
    bhList.push( this.makeDetourBehaviour( scene.sceneItems[j] ) );
  this.addComplexBehaviour( new complexBehaviour( bhList ), cbhList  );
}

function keepPosition( objList )    //elements in list keep position
{
  objList = objList || beingList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].addKeepPositionBehaviour();
}

function detour( objList, dist, target, code )    //elements in list avoid and go around scene items
{
  objList = objList || beingList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].addDetourAllBehaviour( dist, target, code );
}

function avoidObstacles( objList, dist, code )    //elements in list avoid scenery items
{
  dist = dist || 35;
  objList = objList || beingList;

  for ( var i = 0 ; i < objList.length ; i++ )
    for ( var j = 0 ; j < scene.sceneItems.length ; j++ )
      objList[i].addAvoidObstacleBehaviour( scene.sceneItems[j], dist, code );
}

function avoidTarget ( objList, target, dist, code )  //all elements avoid the 'target'
{
  dist = dist || 75;
  objList = objList || beingList;

  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i] !== target )
      objList[i].addAvoidBehaviour( target, dist, code );
}

function avoidOthers( objList, dist, code )   //all elements keep at least a distance to the rest
{
  dist = dist || 75;
  objList = objList || beingList;

  for ( var i = 0 ; i < objList.length ; i++ )
    avoidTarget( objList, objList[i] , dist, code );
}

function gather ( objList, leader, dist, code ) //all elements gather in a closed formation (optionally, around a 'leader')
{
  code = code || 3;
  dist = dist || 75;
  objList = objList || beingList;
  objList = objList.slice();

  if ( leader )
    var center = leader.pos;
  else
  {
    var posList = [];
    for ( var i = 0 ; i < objList.length ; i++ )
      posList.push( objList[i].pos );
    var center = avgVector( posList );
  }
  for ( var i = 0 ; i < objList.length ; i++ )
    if ( !leader || ( leader && objList[i] !== leader ) )
      objList[i].addBasicBehaviour( new rectMovement( objList[i], center ), code );
}

function follow ( objList, leader, dist, code ) //all elements follow the 'leader'
{
  dist = dist || 85;
  objList = objList || beingList;
  objList = objList.slice();

  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i] !== leader )
      objList[i].addChaseBehaviour( leader, dist, code );
}

function followInLine ( objList, leader, dist, code ) //all elements follow the 'leader' in an ordered row
{
  dist = dist || 85;
  objList = objList || beingList;
  objList = objList.slice();

  //REMOVE THE 'LEADER' FROM THE LIST
  objList.removeElement( leader );

  for ( var i = 0 ; objList.length > 0 ; i++ )
  {
    //LOOK FOR THE CLOSEST ELEMENT AND MAKE IT CHASE THE LEADER
    var index   = 0;
    var minDist = Infinity;
    for ( var j = 0 ; j < objList.length ; j++ )
    {
      var distance = leader.pos.minus( objList[j].pos ).sqModulus();
      if ( distance < minDist )
      {
  minDist = distance;
  index = j;
      }
    }
    //MAKE THIS ELEMENT THE NEW LEADER FOR THE REST
    objList[index].addChaseBehaviour( leader, dist, code );
    leader = objList[index];
    objList.splice( index, 1 );
  }
}

function cancelBehaviours( objList )
{
  objList = objList || beingList;
  for ( var i = 0 ; i < objList.length ; i++ )
  {
    objList[i].behaviours   = [];
    objList[i].complexBehaviours= [];
  }
}

being.prototype.setBehaviourPriority = function( value, code )  //set the priority of the behaviour with code 'code' to a 'value'
{
  for ( var j = 0 ; j < this.behaviours.length ; j++ )
    if ( this.behaviours[j].code == code )
    {
      this.behaviours[j].priority = value;
      return true;
    }
  return false;
}

being.prototype.increaseBehaviourPriority = function( code, incr )
{
  incr = incr || 1;
  for ( var j = 0 ; j < this.behaviours.length ; j++ )
    if ( this.behaviours[j].code == code )
    {
      this.behaviours[j].priority += incr;
      return true;
    }
  return false;
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function keyDown( event )
{
  event.preventDefault();

  if ( event.keyCode == 80 ) //'p'  TOGGLE PAUSE GAME
    pauseResumeGame();

  if ( event.keyCode == 49 ) //'1'
  {
    selectElements( false );
    if ( objectList[0] )
    {
      objectList[0].setSelected( true );
//       scene.focus( objectList[0] );
    }
  }
  if ( event.keyCode == 50 ) //'2'
  {
    selectElements( false );
    if ( objectList[1] )
    {
      objectList[1].setSelected( true );
//       scene.focus( objectList[1] );
    }
  }
  if ( event.keyCode == 51 ) //'3'
  {
    selectElements( false );
    if ( objectList[2] )
    {
      objectList[2].setSelected( true );
//       scene.focus( objectList[2] );
    }
  }
  if ( event.keyCode == 52 ) //'4'
  {
    selectElements( false );
    if ( objectList[3] )
    {
      objectList[3].setSelected( true );
//       scene.focus( objectList[3] );
    }
  }
  if ( event.keyCode == 53 ) //'5'
  {
    selectElements( false );
    if ( objectList[4] )
    {
      objectList[4].setSelected( true );
//       scene.focus( objectList[4] );
    }
  }
  if ( event.keyCode == 54 ) //'6'
  {
    selectElements( false );
    if ( objectList[5] )
    {
      objectList[5].setSelected( true );
//       scene.focus( objectList[5] );
    }
  }
  if ( event.keyCode == 55 ) //'7'
  {
    selectElements( false );
    if ( objectList[6] )
    {
      objectList[6].setSelected( true );
//       scene.focus( objectList[6] );
    }
  }
  if ( event.keyCode == 56 ) //'8'
  {
    selectElements( false );
    if ( objectList[7] )
    {
      objectList[7].setSelected( true );
//       scene.focus( objectList[7] );
    }
  }
  if ( event.keyCode == 57 ) //'9'
  {
    selectElements( false );
    if ( objectList[8] )
    {
      objectList[8].setSelected( true );
//       scene.focus( objectList[8] );
    }
  }
  if ( event.keyCode == 48 ) //'0'
    selectElements( true );

//    if ( event.keyCode == 13 )  ///'enter'
//     objectList[0].setPosition( new vector(0,0) ) ;

  //////////////// BEHAVIOURS \\\\\\\\\\\\\\\\\\\\TODO this can be done on an individual basis
  if ( event.keyCode == 96 )    // KP_0
    avoidOthers( selectedList );

  if ( event.keyCode == 97 )    // KP_1
    followInLine( selectedList, objectList[1] );

  if ( event.keyCode == 98 )    // KP_2
    follow( selectedList, objectList[1] );

  if ( event.keyCode == 99 )    // KP_3
    gather( selectedList );

  if ( event.keyCode == 100 )   // KP_4
    gather( selectedList, objectList[1] );

  if ( event.keyCode == 101 )   // KP_5
  {
//     avoidObstacles(selectedList);
     detour( selectedList );
  }

  if ( event.keyCode == 102 )   // KP_6
     keepPosition( selectedList );

  if ( event.keyCode == 110 )   // KP_DEL
    cancelBehaviours( selectedList );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function sceneItem( SVGNode )   //interactive item that is part of the scenery,
{
  if ( !SVGNode ) return;
  ///GENERAL
  this.SVGNode = SVGNode;
  this.id = this.SVGNode.id;

  //PARTS
  this.parts = [];

  if ( this.SVGNode.nodeName == 'g' )
  {
    for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
      if ( child.nodeName == 'rect' || child.nodeName == 'circle' || child.nodeName == 'ellipse' || child.nodeName == 'path' )
  this.parts.push( new part( child.getAttribute( 'id' ) , this ) );
  }
  else
    this.parts.push( new part( this.SVGNode.id , this ) );

  this.shape = this.parts[0].shape;       //assuming that it is described by a single polygon

    //divide convex polygons into simple concave polygon 'parts'
    for ( var i = 0 ; i < this.parts.length ; i++ )
      if ( this.parts[i].shape instanceof polygon && this.parts[i].shape.isConvex() )
      {
  var polyList = this.parts[i].shape.splitPolygon();      //split into a set of concave polygons
  for ( var k = 0 ; k < polyList.length ; k++ )       //add the new concave polygons (beginning)
    this.parts.unshift( new part( undefined, this, polyList[k] ) );
  this.parts.splice( k, 1 );            //remove the convex polygon
  i = i + polyList.length - 1;            //index to start next iteration at 'same place'
      }

  ///DIMENSIONS
  var maxRight = -Infinity;
  var maxLeft  =  Infinity;
  var maxBottom= -Infinity;
  var maxTop   =  Infinity;
  for ( var i = 0 ; i < this.parts.length ; i++ )
  {
    var right = this.parts[i].pos.x + this.parts[i].width/2;
    var left  = this.parts[i].pos.x - this.parts[i].width/2;
    var bottom= this.parts[i].pos.y + this.parts[i].height/2;
    var top   = this.parts[i].pos.y - this.parts[i].height/2;
    if ( right > maxRight )
      maxRight = right;
    if ( left < maxLeft )
      maxLeft = left;
    if ( bottom > maxBottom )
      maxBottom = bottom;
    if ( top < maxTop )
      maxTop = top;
  }
  this.width  = maxRight - maxLeft;
  this.height = maxBottom - maxTop;

  ///LOCATION
  var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || maxLeft;    //'SVG coords' are top-left corners
  var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || maxTop ;
  this.pos = new vector( readX + this.width/2, readY + this.height/2 );     //center of the object
  this.BBox = new rectangle( this.width, this.height, this.pos );
  this.BBox.currentAngle = 0;

  //set part's positions relative to the element position
  for ( var i = 0 ; i < this.parts.length ; i++ )
    this.parts[i].pos = this.parts[i].pos.minus( this.pos );
}

sceneItem.prototype.distanceFromFaceTo = function( point )
{
  return this.shape.distanceFromFaceTo( point );
}

sceneItem.prototype.closestNormalTo = function( point )
{
  var minDist = Infinity;
  var normal = undefined;
  for ( var i = 0 ; i < this.parts.length ; i++ )
  {
    var index = this.parts[i].shape.isFacing( point );
    var distFace = point.minus( this.parts[i].shape.globalPoints()[index] ).project( this.parts[i].shape.normals[index] );
    if ( distFace < minDist )
    {
      minDist = distFace;
      normal = this.parts[i].shape.normals[index];
    }
  }
  return new vector( normal );
}

function map( SVGNode, viewBoxCoords, viewBoxSizeX, viewBoxSizeY ) ///coordinates are CENTER of the view box
{
  if ( !SVGNode ) return;
  this.SVGNode = SVGNode;
  this.id = this.SVGNode.id;
  this.SVGNode.setAttribute( 'x', 0 );
  this.SVGNode.setAttribute( 'y', 0 );
  this.SVGNode.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );  ///keep aspect ratio when stretching
  this.SVGNode.setAttribute( 'overflow' , 'visible' );

  //INITIALIZE ALL SOLID ELEMENTS
  var sceneItemsGNode = undefined;
  this.sceneItems = [];
  for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    if ( child.nodeName == 'g' && child.getAttribute( 'id' ) == 'sceneItems' )
      sceneItemsGNode = child;
  if ( sceneItemsGNode )
    for ( var child = sceneItemsGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.sceneItems.push( new sceneItem( child ) );

  //CAMERA PARAMETERS
  this.zoomFactor = 0.95;
  this.zoomState = 0;
  this.panRightLeft = 0;
  this.panUpDown = 0;
  this.followedObj = undefined;
  this.centerObj = false;
  this.mousePan = false;
  this.maxZoom = 10;

  //MAP PARAMETERS

  this.mapSizeX = this.SVGNode.width.baseVal.value; ///Get the original dimensions, these are PROPORTIONAL to the REAL drawing.
  this.mapSizeY = this.SVGNode.height.baseVal.value;  ///Use these for boundary checks.

   this.SVGNode.setAttribute( 'width', window.innerWidth );     ///Adjust the drawing to the screen.
   this.SVGNode.setAttribute( 'height',window.innerHeight );      ///One of these dimensions will NOT be proportional to the drawing.

  ///SET THE INITIAL VIEW BOX
  if ( viewBoxCoords && viewBoxSizeX  )
  {
    this.viewBoxWidth = viewBoxSizeX;
    if ( !viewBoxSizeY )
      this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    else
      this.viewBoxHeight = viewBoxSizeY;
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
      this.scroll = new vector ( params[0] + this.viewBoxWidth/2, params[1] + this.viewBoxHeight/2 ) ;
    }
    else
    {
      this.viewBoxWidth  = this.mapSizeX;
      this.viewBoxHeight = this.mapSizeY;
      this.scroll = new vector( this.viewBoxWidth/2, this.viewBoxHeight/2 );
    }
  }
  this.setViewBox();

  ///SET EVENTS
  var that = this;
  this.keyHandler    = function ( event ){ that.keyDown( event )  };
  this.keyStopHandler    = function ( event ){ that.keyStop( event )  };
  this.mouseDownHandler  = function ( event ){ that.mouseDown( event )  };
  this.mouseClickHandler = function ( event ){ that.mouseClick( event ) };
  this.wheelHandler  = function ( event ){ that.wheel( event )  };


  document.addEventListener ( 'keydown',    this.keyHandler ,   false );
  document.addEventListener ( 'keyup',    this.keyStopHandler,  false );
  this.SVGNode.addEventListener ( 'mousedown',    this.mouseDownHandler,  false );
  this.SVGNode.addEventListener ( 'click',    this.mouseClickHandler ,false );
  this.SVGNode.addEventListener ( 'DOMMouseScroll', this.wheelHandler,  false );		//FF
  this.SVGNode.addEventListener ( 'mousewheel', this.wheelHandler,  false );			//Chrome
}

map.prototype.adjustViewBox = function ()
{
  ///Make viewBox no bigger than map and no smaller than maxZoom
  if ( this.viewBoxHeight >= this.viewBoxWidth && this.viewBoxWidth <= this.maxZoom )
  {
    this.viewBoxWidth = this.maxZoom;
    this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
  }

  else if ( this.viewBoxHeight < this.viewBoxWidth && this.viewBoxHeight <= this.maxZoom )
  {
    this.viewBoxHeight = this.maxZoom;
    this.viewBoxWidth  = this.viewBoxHeight*window.innerWidth/window.innerHeight;
  }

  if ( this.viewBoxHeight <= this.viewBoxWidth && this.viewBoxWidth > this.mapSizeX )
  {
    this.viewBoxWidth = this.mapSizeX;
    this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
  }

  if ( this.viewBoxHeight > this.viewBoxWidth && this.viewBoxHeight > this.mapSizeY )
  {
    this.viewBoxHeight = this.mapSizeY;
    this.viewBoxWidth  = this.viewBoxHeight*window.innerWidth/window.innerHeight;
  }

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

map.prototype.setViewBox = function ( newPoint, newWidth, newHeight )      //Set viewBox according to inner variables or input parameters.
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

map.prototype.adjustScroll = function ()         ///adjusts scrolls so that the camera does not go out of the map
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

map.prototype.viewBoxChange = function( newPoint, newSizeX, newSizeY )           //when there is zoom and pan, not only setViewBox, but also update the front panel info
{
  this.setViewBox( newPoint, newSizeX, newSizeY );
  for ( var i = 0 ; i < itemList.length ; i++ )
  {
    itemList[i].setSCircle();
    itemList[i].placeCMenu();
  }
}

map.prototype.fromScreen = function( screenCoords )
{
  var x =  screenCoords.x*this.viewBoxWidth/window.innerWidth + this.scroll.x - this.viewBoxWidth/2 ;
  var y =  screenCoords.y*this.viewBoxHeight/window.innerHeight + this.scroll.y - this.viewBoxHeight/2 ;
  return ( new vector( x, y ) );
}

map.prototype.toScreen = function( mapCoords )
{
  var x =  ( mapCoords.x - this.scroll.x + this.viewBoxWidth/2 )*window.innerWidth/this.viewBoxWidth;
  var y =  ( mapCoords.y - this.scroll.y + this.viewBoxHeight/2 )*window.innerHeight/this.viewBoxHeight;
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
      this.scroll = new vector( pos );
    else if ( this.followedObj instanceof object )
      this.scroll = new vector( this.followedObj.pos );

      this.viewBoxChange();
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
      this.scroll = new vector( pos );
    else if ( this.followedObj instanceof object )
      this.scroll = new vector( this.followedObj.pos );

    this.viewBoxChange();
  }
}

map.prototype.zoom = function ( newPoint, newSizeX, newSizeY )  ///set camera to this position if parameters, perform zoomState otherwise.
{
  if( newPoint )
    this.viewBoxChange( newPoint, newSizeX, newSizeY );
  else if ( this.zoomState == 1 )
    this.zoomIn();
  else if ( this.zoomState == 2 )
    this.zoomOut();
}

map.prototype.setMaxZoom = function ( obj ) ///sets max zoom to 1.5x the size of the input object, or the biggest selected element, (or to a number)
{
    if ( typeof obj == "number" )
      this.maxZoom = obj;
    else
    {
      var list = [];

      if ( obj instanceof object )
	list = new Array( obj );
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

map.prototype.adjustZoom = function() ///adjusts if the current zoom is too big
{
    if ( this.viewBoxWidth < this.maxZoom )
      this.viewBoxWidth  = this.maxZoom;
    if ( this.viewBoxHeight < this.maxZoom )
      this.viewBoxHeight = this.maxZoom;
}

map.prototype.focus = function ( object, level )
{
  var level = level || defFocusLevel;
  this.viewBoxChange( object.pos, object.width*level, object.height*level );
}

map.prototype.pan = function( dirX, dirY )
{
  if ( !this.followedObj )
  {
    dirX =  dirX || this.panRightLeft;
    dirY =  dirY || this.panUpDown;

    if ( dirY == 2 )
      this.scroll.y += this.viewBoxHeight/panSteps;
    else if ( dirY == 1 )
      this.scroll.y -= this.viewBoxHeight/panSteps;

    if ( dirX == 1 )
      this.scroll.x += this.viewBoxWidth/panSteps;
    else if ( dirX == 2 )
      this.scroll.x -= this.viewBoxWidth/panSteps;

    if ( dirX || dirY )
      this.viewBoxChange();
  }
  else
    this.follow();
}

map.prototype.follow = function ( obj, centered )     ///set followed object and if the camera is centered, and/or perform the tracking.
{
    ///SET THE FOLLOWING PARAMETERS
    if ( centered != undefined )
      this.centerObj = centered;
    if ( obj instanceof object )
      this.followedObj = obj;

    if ( this.followedObj )
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
      this.viewBoxChange();
    }
}

map.prototype.unfollow = function ()
{
  this.followedObj = undefined
}

map.prototype.insertElement = function( element ) //insert an element into the map and its lists
{
  if ( element instanceof item )
    itemList.push( element );
  if ( element instanceof object )
    objectList.push( element );
  if ( element instanceof being )
    beingList.push( element );
  if ( element instanceof character )
    characterList.push( element );

  collisionTree.insertElement( element )
  this.SVGNode.appendChild( element.SVGNode );
}

map.prototype.removeElement = function( element ) //remove an element from the map and its lists
{
  itemList.removeElement( element );
  objectList.removeElement( element );
  beingList.removeElement( element );
  characterList.removeElement( element );
  collisionTree.removeElement( element );
  element.SVGNode.parentNode.removeChild( element.SVGNode );
}

map.prototype.keyDown = function ( event )
{
  if ( event.keyCode == 40 && this.scroll.y + this.viewBoxHeight/2 <= this.mapSizeY ) ///down
    this.panUpDown = 2;
  if ( event.keyCode == 38 && this.scroll.y >= this.viewBoxHeight/2   ) ///up
    this.panUpDown = 1;
  if ( event.keyCode == 39 && this.scroll.x + this.viewBoxWidth/2<= this.mapSizeX )   ///right
    this.panRightLeft = 1;
  if ( event.keyCode == 37 && this.scroll.x >= this.viewBoxWidth/2    )   ///left
    this.panRightLeft = 2;

  if ( event.keyCode == 34 )     ///PG_DOWN ZOOM IN
    this.zoomState = 1;
  if ( event.keyCode == 33 )     ///PG_UP ZOOM OUT
    this.zoomState = 2;
}

map.prototype.keyStop = function ( event )
{
    if ( event.keyCode == 33 || event.keyCode == 34 )
      this.zoomState = 0;
    if ( event.keyCode == 38 || event.keyCode == 40 )
      this.panUpDown = 0;
    if ( event.keyCode == 37 || event.keyCode == 39 )
      this.panRightLeft = 0;
}

map.prototype.mouseClick = function ( event ) //move selected elements to the map position ( with 'shift', put in order queue )
{
  lockEvent( event );
  var mapCoords = this.fromScreen( new vector( event.clientX, event.clientY ) );

  var tellPosition = !true;	//Trick to guess the map coords of a point easily
  if ( tellPosition ) alert( mapCoords.x + ' , ' + mapCoords.y );

  if ( event.button == '0' ) //left button
    for ( var i = 0 ; i < selectedList.length ; i++ )
    {
      if ( !event.shiftKey )
        selectedList[i].removeAllComplexBehaviours( selectedList[i].orders );
      selectedList[i].addGoToCBehaviour( mapCoords, true ); //'true' means its an order
    }
}

map.prototype.mouseDown = function ( event )
{
  lockEvent( event );
  var screenCoords = new vector( event.clientX, event.clientY );

  if ( event.button == '0' ) //left button - selection box
    if ( !selectBox.active )
      selectBox.beginDraw( screenCoords.x, screenCoords.y );

  if ( event.button == '2' ) //right button - center camera in position
    this.zoom( this.fromScreen( screenCoords ) );

  if ( event.button == '1' ) //middle button - toggle mouse pan mode
    {
      if ( !this.mousePan )
      {
  this.mousePan = true;
  var that = this;
  this.mouseHandler = function( event ) { that.mouseMove( event ); }
  document.addEventListener( 'mousemove', this.mouseHandler, false );
      }
      else
      {
  this.mousePan = false;
  this.mouseHandler = undefined;
  document.removeEventListener( 'mousemove', this.mouseHandler, false );
      }
  }
}

function mouseUp ( event )
{
  lockEvent( event );
  if ( event.button == '0' ) //left button
  {
    selectBox.unDraw();
    //BOX-SELECT, if dragging has occured
    if ( selectBox.width != 0 && selectBox.height != 0 )
    {
      //Make a list with the elements inside the box
      var rect = selectBox.getMapRectangle();
      var list = [];
      for ( var i = 0 ; i < objectList.length ; i++ )
  if ( overlapPoints( objectList[i], rect ) )
    list.push( objectList[i] );

      //Toggle
      if ( event.ctrlKey )
      {
  for ( var i = 0 ; i < list.length ; i++ )
    list[i].toggleSelected();
      }
      //Select only these
      else
      {
  selectElements( false );
  selectElements( true , list );
      }
    }
  }
}

map.prototype.mouseMove = function ( event )  //move camera when cursor is close to border
{
  if ( this.mousePan )
  {
    if ( event.clientX <= 5 )
      this.panRightLeft = 2;
    else if ( event.clientX >= window.innerWidth - 5 )
      this.panRightLeft = 1;
    else
      this.panRightLeft = 0;

    if ( event.clientY <= 5 )
      this.panUpDown = 1;
    else if ( event.clientY >= window.innerHeight - 5 )
      this.panUpDown = 2;
    else
      this.panUpDown = 0;
  }
  if ( selectBox.active )
    selectBox.reDraw( event.clientX, event.clientY );
}

map.prototype.wheel = function ( event )
{
  var wheelData = event.detail ? event.detail * -1 : event.wheelDelta / 40;	//normalize FF and Chrome the FF way
  if ( this.followedObj instanceof object ) ///element selected, zoom to element position
  {
    if ( wheelData > 0 )
      this.zoomIn( this.followedObj.getPosition() );
    else
      this.zoomOut( this.followedObj.getPosition() );
  }
  else          /// zoom to mouse position
  {
    var aux = new vector( this.viewBoxWidth, this.viewBoxHeight );
    aux = aux.multiply( ( this.zoomFactor - 1 )/2 );

    var aux2 = new vector ( event.clientX*this.viewBoxWidth/window.innerWidth, event.clientY*this.viewBoxHeight/window.innerHeight );
    aux2 = aux2.multiply( 1 - this.zoomFactor );

    if ( wheelData < 0 )
      this.zoomIn( this.scroll.add( aux ).add( aux2 ) );
    else
      this.zoomOut( this.scroll.minus( aux ).minus( aux2 ) );
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//* effect: event that is active for a while and affects behaviours or variables

function selectionBox()
{
  this.SVGNode = document.createElementNS( 'http://www.w3.org/2000/svg' , 'rect' );
  this.SVGNode.setAttribute( 'id' , 'selectionBox' );
  this.SVGNode.setAttribute( 'style' , 'fill:none;stroke:#008000' );
  this.origX = 0;
  this.origY = 0;
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
  this.active = false;
}

selectionBox.prototype.setOrig = function ( x, y )
{
  this.origX = x;
  this.origY = y;
  this.SVGNode.setAttribute( 'x' , x );
  this.SVGNode.setAttribute( 'y' , y );
}

selectionBox.prototype.setCorner = function ( x, y )
{
  this.x = x;
  this.y = y;
  this.SVGNode.setAttribute( 'x' , x );
  this.SVGNode.setAttribute( 'y' , y );
}

selectionBox.prototype.setDimensions = function ( width, height )
{
  this.width = width;
  this.height = height;
  this.SVGNode.setAttribute( 'width' , width );
  this.SVGNode.setAttribute( 'height' , height );
}

selectionBox.prototype.beginDraw = function ( x, y )
{
  this.setOrig( x, y );
  this.setDimensions( 0, 0 );
  svgMain.appendChild( this.SVGNode );
  this.active = true;
  document.addEventListener( 'mousemove', scene.mouseMove, false ); //no closure needed here
}

selectionBox.prototype.reDraw = function ( x, y )
{
  if ( x > this.origX )
  {
    this.x = this.origX;
    this.width = x - this.origX;
  }
  else
  {
    this.x = x;
    this.width = this.origX - x;
  }
  if ( y > this.origY )
  {
    this.y = this.origY;
    this.height = y - this.origY;
  }
  else
  {
    this.y = y;
    this.height = this.origY - y;
  }
  this.SVGNode.setAttribute( 'x' , this.x );
  this.SVGNode.setAttribute( 'y' , this.y );
  this.SVGNode.setAttribute( 'width' , this.width );
  this.SVGNode.setAttribute( 'height' , this.height);
}

selectionBox.prototype.unDraw = function ()
{
  if ( this.active )
  {
    this.active = false;
    document.removeEventListener( 'mousemove', scene.mouseMove, false ); //no closure needed here
    svgMain.removeChild( this.SVGNode );
  }
}

selectionBox.prototype.getMapRectangle = function()
{
  var p = scene.fromScreen( new vector ( this.x + this.width/2, this.y + this.height/2 ) );
  var dimensions = scene.fromScreen( new vector ( this.width, this.height ) );//p2.minus( p1 );
  return new rectangle( dimensions.x, dimensions.y, p );
}

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function panel( SVGNode )
{
  if ( !SVGNode ) return;
  this.SVGNode = SVGNode;
  this.id = this.SVGNode.id;
  this.SVGNode.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );     ///keep aspect ratio when stretching
  this.SVGNode.setAttribute( 'overflow' , 'visible' );

  this.SVGNode.setAttribute( 'width', window.innerWidth );      ///Adjust the drawing to the screen.
  this.SVGNode.setAttribute( 'height',window.innerHeight );     ///One of these dimensions will NOT be proportional to the drawing.
}

function hideElement( node, timeout )
{
  if ( timeout )
  {
    node.setAttribute( "display", "block" );
    function f() { node.setAttribute( "display", "none" )};
    mainTimer.addCountDown( f , timeout );
  }
  else
    node.setAttribute( 'display', 'none' );
}

function text( str, style, pos, chPerLine, width )      //text object consisting on several lines of text
{
  str = str || '';
  style = style || txtStyle;
  this.chPerLine = chPerLine || defChPerLine;
  this.lines = [];
  this.pos = pos;
  this.SVGNode = document.createElementNS( 'http://www.w3.org/2000/svg' , 'text' );

  frontPanel.SVGNode.appendChild( this.SVGNode );
  this.addLines( str );
  
  this.setPos( pos );
  this.setSize( width );
  this.SVGNode.setAttribute( 'adjustLength', 'spacingAndGlyphs' );
  this.SVGNode.setAttribute( 'style', style  );
  this.SVGNode.style.cursor = 'default';          //disable text cursor
}

text.prototype.addLine = function( str, style, dy ) //Add a <tspan> node as a new line
{
  dy = dy || '1.5em';
  this.lines.push( str ); 
  
  var tspanNode = document.createElementNS( 'http://www.w3.org/2000/svg' , 'tspan' );
  if ( this.pos )
    tspanNode.setAttribute( 'x', this.pos.x );
  tspanNode.setAttribute( 'dy', dy );
  if ( style )
    tspanNode.setAttribute( 'style', style );
  tspanNode.appendChild( document.createTextNode( str ) );
  this.SVGNode.appendChild( tspanNode );
}

function splitIntoLines( str, chPerLine )    //Split the words and separate them in lines so that words aren't cut
{
  chPerLine = chPerLine || defChPerLine;
  var words = str.split( ' ' );
  var lines = [];
  lines[0] = '';
  var lin = 0;
  for( var i = 0 ; i < words.length ; i++ )
  {
    lines[ lin ] += words[i] + ' ';
    //if next word would exceed the limit, begin a new line
    if ( i < words.length -1 &&  lines[ lin ].length + words[i+1].length + 1 > chPerLine )
    {
      lin++;
      lines[ lin ] = '';
    }
  }
  return lines;
}

text.prototype.addLines = function( str, style )    //Split the words and separate them in lines so that words aren't cut
{
  var newLines = splitIntoLines( str, this.chPerLine );
  for( var i = 0 ; i < newLines.length ; i++ )
    this.addLine( newLines[ i ] , style );    
}

text.prototype.align = function()
{
  var nodes = this.SVGNode.getElementsByTagName( 'tspan' );
  for( var i = 0 ; i < nodes.length ; i++ )
    nodes[i].setAttribute( 'x', this.pos.x );
}

text.prototype.setPos = function( pos )
{
  pos = pos || new vector( ( window.innerWidth )/2 , window.innerHeight/2 );
  this.pos = pos.minus( this.getWidth()/2, 0 );
  this.SVGNode.setAttribute( 'x', this.pos.x );
  this.SVGNode.setAttribute( 'y', this.pos.y );
  this.align();
}

text.prototype.setSize = function( width )
{
  if ( width )
    this.width = width;
  this.SVGNode.setAttribute( 'textLength', this.width );   //not implemented in firefox
}

text.prototype.getWidth = function()
{
  var charWidth = this.SVGNode.getComputedTextLength() / this.SVGNode.getNumberOfChars();   //average width of a character
  var maxWidth = 0;
  for ( var i = 0 ; i < this.lines.length ; i++ )
  {
    var width = this.lines[i].length * charWidth;
    if ( width > maxWidth )
      maxWidth = width;
  }
  return maxWidth;
}

text.prototype.clear = function()   //remove all lines
{
  for ( var child = this.SVGNode.firstElementChild ; child != null ; child = nextChild )
  {
    var nextChild = child.nextElementSibling;
    this.SVGNode.removeChild( child );
  }
  this.lines = [];
}
 
text.prototype.remove = function()
{
  this.SVGNode.parentNode.removeChild( this.SVGNode );
}

text.prototype.addMouseFunction = function( fn )	//add a function to execute on mousedown event, clear() by default
{
  var that = this;
  fn = fn || function(){ that.clear() };
  this.SVGNode.addEventListener( 'mousedown' , fn , false );
}

text.prototype.setValue = function( value )
{
  this.clear();
  this.addLine( value );
}

textSequence.prototype = new sequence();    //new objects created with 'new' and this function will have this obj as their prototype to look up to
textSequence.prototype.constructor = textSequence;

function textSequence( str, style, pos, lines, chPerLine, width, removeAtEnd )        //sequence of text objects. Separated each number of lines and/or by the separator '||'
{
  lines = lines || defTextLines;
  this.txtSeq = [];    
  this.currentIndex = 0;
  this.timer = undefined;
  this.removeAtEnd = removeAtEnd || true;

  //Separate by '||' and number of lines
  var txtParts = str.split( '||' );
  var lineGroups = [];
  for ( var i = 0 ; i < txtParts.length ; i++ )
  {
    var allLines = splitIntoLines( txtParts[i] , chPerLine );
    var cuts = Math.ceil( allLines.length/lines );
    for ( var j = 0 ; j < cuts ; j++ )
      lineGroups.push( allLines.slice( j*lines , (j+1)*lines ) );
  }

  //Create the text objects and save them
  for ( var j = 0 ; j < lineGroups.length ; j++ )
  {
    //Create an empty text object
    var txtPart = new text( undefined, style, pos, chPerLine, width );

    //Fill it with the right number of lines
    for ( var i = 0 ; i < lineGroups[j].length ; i++ )
      txtPart.addLine( lineGroups[j][i] , style );
    txtPart.setPos( txtPart.pos );
    txtPart.lines.concat( lineGroups[j] ); 

    //Click to go next in the sequence
    var that = this;
    txtPart.SVGNode.addEventListener( 'mousedown' , function(){ that.next(); mainTimer.resetCount( that.timer ) } , false );

    //Add to the sequence
    this.txtSeq.push( txtPart );
    hideElement( txtPart.SVGNode );
  }
  this.txtSeq[0].SVGNode.setAttribute( 'display' , 'block' );
}
  
textSequence.prototype.goTo = function( index )	//the sequence will be destroyed if out of bounds.
{
  index = index == undefined ? 0 : index;
  if ( index < 0 || index >= this.txtSeq.length )
    if ( this.removeAtEnd )
      this.remove();			//remove the text nodes and the counter
    else
      mainTimer.removeCount( this.timer );
  else
  {
    hideElement( this.txtSeq[ this.currentIndex ].SVGNode );
    this.currentIndex = index;
    this.txtSeq[ index ].SVGNode.setAttribute( 'display' , 'block' );
  }
}

textSequence.prototype.remove = function()		//remove the text nodes and the timer
{
  for ( var i = 0 ; i < this.txtSeq.length ; i++ )
    this.txtSeq[ i ].remove();
  mainTimer.removeCount( this.timer );
}

function conversationTreeNode( node, rootNode ) //Node representing a step in a conversation
{						//If no rootNode given, assume this is the first node
  this.SVGNode = node;
  if ( this.SVGNode )
  {
    var link = this.SVGNode.getAttribute( 'go' );
    if ( !link )
    {
      this.rootSVGNode = rootNode || this.SVGNode;	//reference to the first node, used for searching an arbitrary node in the tree
      this.id = this.SVGNode.getAttribute( 'id' );
      this.style = this.SVGNode.getAttribute( 'style' ) || questionStyle;
      this.question = this.SVGNode.getAttribute( 'question' ) || '';	//text that is read when entering the node
      this.answer = this.SVGNode.getAttribute( 'answer' ) || '';		//text that leads to this node
      this.answers = [];			//other conversation nodes to go from here
      this.duration = this.SVGNode.getAttribute( 'duration' ) || textDuration;
      this.questionTXT = undefined;
      this.answersTXT  = [];
      this.pos = this.rootSVGNode.pos;
    }
    else if ( rootNode )
      conversationTreeNode.call( this , getSVGChildById( rootNode, link ), rootNode );
  }
}

conversationTreeNode.prototype.show = function ( pos )	//shows the conversation menu, generating answer nodes
{
  this.pos = pos ? pos : this.pos;
  var pos = this.pos || new vector( window.innerWidth/2 ,  window.innerHeight/2 );

  //CREATE ANSWER NODES
  for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    this.answers.push( new conversationTreeNode( child, this.rootSVGNode ) );

  function goAnswer( cnode , i )        //enclosure trick, to define functions with the variables of a loop
  {
    var f = function()
    {
      cnode.answers[i].show();
      cnode.remove();
    }
    return f;
  }; 
  
  //CREATE QUESTION NODE
  pos = pos.minus( 0 , menuRowDistance * ( 1.5 + this.answers.length ) / 2 );	//center the text TODO
  this.questionTXT = new textSequence( this.question, this.style, pos );
  this.questionTXT.removeAtEnd = false;
  this.questionTXT.play();

  //DRAW ANSWER NODES
  pos = pos.add( 0 , menuRowDistance/2 );	//TODO to compensate distance from question to answers. Investigate
  for ( var i = 0 ; i < this.answers.length ; i++ )
  {
    pos = pos.add( 0 , menuRowDistance );
    var txt = new text( this.answers[i].answer, answerStyle, pos );
    txt.addMouseFunction( goAnswer( this, i ) );
    this.answersTXT.push( txt );
  }

  //IF NO ANSWER REMOVE (either on click, or after a while)
  if ( this.answers.length == 0 )
    this.questionTXT.removeAtEnd = true;
}

conversationTreeNode.prototype.remove = function()
{
  this.questionTXT.remove();
  for ( var i = 0 ; i < this.answersTXT.length ; i++ )
    this.answersTXT[i].remove();
  this.answersTXT = [];
  this.answers = [];
}

function bar( maxValue, color, pos, height, width )
{
  this.pos = pos || new vector( 20, 20 );
  this.height = height || 20;
  this.width = width || 100;
  this.maxValue = maxValue || 100;
  this.value = this.maxValue;
  color = color || 'red';

  var group = document.createElementNS( 'http://www.w3.org/2000/svg' , 'g' );
  var outRect = document.createElementNS( 'http://www.w3.org/2000/svg' , 'rect' );
  this.inRect = document.createElementNS( 'http://www.w3.org/2000/svg' , 'rect' );

  group.appendChild( outRect );
  group.appendChild( this.inRect );

  this.inRect.setAttribute( 'x' , this.pos.x );
  this.inRect.setAttribute( 'y' , this.pos.y );
  outRect.setAttribute( 'x' , this.pos.x );
  outRect.setAttribute( 'y' , this.pos.y );

  outRect.setAttribute( 'style' , 'fill:none;stroke:#000000' );
  this.inRect.setAttribute( 'style' , 'fill:' + color );

  outRect.setAttribute( 'width' , this.width );
  outRect.setAttribute( 'height' , this.height );

  this.inRect.setAttribute( 'width' , this.width );
  this.inRect.setAttribute( 'height' , this.height );

  frontPanel.SVGNode.appendChild( group );
}

bar.prototype.setValue = function( value )
{
  this.value = value > this.maxValue ? this.maxValue : value;
  this.value = value < 0 ? 0 : this.value;
  this.inRect.setAttribute( 'width' , value*this.width/this.maxValue );
}

statusValue.prototype.bind = function( indicator )	//bind an indicator to a status value, so it reflects its values
{
  function f( event ) { indicator.setValue( event.conditionStr ); };
  this.rootObj.evDispatcher.addEventListener( new eventListener( this.name, f, undefined ) );
}


///////////////////////////////////////////////////////////////////////////////////////////////
