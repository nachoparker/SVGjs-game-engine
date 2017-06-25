//	TODO
//	====
//	* get rid of subject
//
//	* collision detection
//	* onscreen information panel
//	* include external SVGs - 'use or image' (no Mozilla support yet!!), coordinating from an upperlevel XHTML document or using AJAX
//	* XML configuration file
//	* resize event
//	* toggle 'follow character' mode (map/camera property)

addEventListener( 'load', init, false );

function init()
{
  document.documentElement.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );
  document.documentElement.setAttribute( 'width' , window.innerWidth );
  document.documentElement.setAttribute( 'height', window.innerHeight );
  
//   allList	= getList();//problem with two objects refering the same node. workaround: define after 'scene'
  scene		= getList( 'map', 'main' 	)[0]	;//allList.filter('map','main')[0];
  elementList 	= getList( 'element' )	 		;//allList.filter('element');
  characterList	= getList( 'element', 'character')	;//elementList.filter('character')
  objectList 	= getList( 'element', 'object' 	)	;//..............
  subject	= objectList[1];//   subject 	= characterList.search( 'subject' );

  if ( !scene || !subject ) return;
    
  document.addEventListener( 'keydown', 	keyboard, 	false );
  document.addEventListener( 'keyup', 		keystop, 	false );
  document.addEventListener( 'mousedown', 	mouse, 		false );
  document.addEventListener( 'DOMMouseScroll',	wheel,		false );
  
  scene.maxZoom = subject.height;
  photogramsPerCycle = 10;
  moveSteps = 200;
  moveIncrements = scene.viewBoxWidth/moveSteps; //TODO put in map class?????movement class?????
  setInterval( 'drawFrame()', 50 );
}

function drawFrame()
{
  if (subject.state == 'moving')subject.move();
  // if ( subject.state == 'mousemoving' )
  // subject.moveTo();
  // else
//       doMovements();
  //     doAnimations();
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
      if ( auxAttr )
	if ( value )
	{
	  if ( auxAttr == value )
	    nodeList.push( SVGlist[i] );
	}
	else
	  nodeList.push( SVGlist[i] );
    }
    else
      nodeList = SVGlist;
    
    return nodeList;
}

function getList( attribute, value )  ///Returns list of objects, each one of its correct object type. List contains 'attribute=value', 'attribute'=(any)', or all SVGs.
{
//  var attribute = attribute || 'element';
  var list = [];
  var nodeList = getSVGNodeList( attribute, value ); 	//gets all SVGs if no attribute, all of kind 'attribute' if no 'value'

  for ( var i = 0 ; i < nodeList.length ; i++ )
    if ( nodeList[i].getAttribute( 'element' ) )
    {
      if ( nodeList[i].getAttribute( 'element' ) == 'object' )
	list[i] = new element( nodeList[i].getAttribute( 'id' ) );
	
      else if ( nodeList[i].getAttribute( 'element' ) == 'character' )
      list[i] = new character( nodeList[i].getAttribute( 'id' ) );
    }    
    else if ( nodeList[i].getAttribute( 'map' ) )
      list[i] = new map( nodeList[i].getAttribute( 'id' ) );
  
  return list;
}

function element( id, coordinates )
{
  if ( !id ) return;
  ///GENERAL
  this.SVGNode = document.getElementById( id );
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'element' );

  ///WRAP EVERYTHING IN A GROUP
  this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  this.group.setAttribute( 'id' , id + 'group' );

  while ( this.SVGNode.childNodes.length > 0 )
    this.group.appendChild( this.SVGNode.firstChild );
  
  this.SVGNode.appendChild( this.group );
  
  ///STATUS
  this.state	 	= 'none';
  this.animation 	= 'none';
  this.moveDir 	 	= 'none';
  this.orientation 	= 'left';

  ///DIMENSIONS AND LOCATION
  this.width  	= this.SVGNode.getAttribute( 'width'  )-0	;//= this.height*0.7;
  this.height 	= this.SVGNode.getAttribute( 'height' )-0	;
  if ( !this.width || !this.height )
  {
    this.height = 10;
    this.width  = this.height*window.innerWidth/window.innerHeight; 
  }
  if ( coordinates )
  {
    this.pos = coordinates;
    this.SVGNode.setAttribute( 'x', this.pos.x-0 /*- this.width/2*/ );
    this.SVGNode.setAttribute( 'y', this.pos.y-0 /*- this.height/2*/ );
  }
  else
    this.pos = new point( this.SVGNode.getAttribute( 'x' ), this.SVGNode.getAttribute( 'y' ) );

// //   document.addEventListener( 'keydown', 	element.key, 	false );
//   document.addEventListener( 'keyup', 		element.keyStop,false );alert('fixme');
//   document.addEventListener( 'mousedown', 	element.mouse,	false );
//   document.addEventListener( 'DOMMouseScroll',	element.wheel,	false );
}

function character( id, coordinates )          /// Character constructor, from SVG element with id 'id' in SVG DOM tree.
{
  element.call( this, id, coordinates );

  this.lArm = document.getElementById( id + 'leftarm' );
  this.rArm = document.getElementById( id + 'rightarm');
  this.lLeg = document.getElementById( id + 'leftleg' );
  this.rLeg = document.getElementById( id + 'rightleg');
  this.head = document.getElementById( id + 'head'    );
  
  this.lArmAxis = new point( this.lArm.getAttribute( 'lArmAxisX' )-0 , this.lArm.getAttribute( 'lArmAxisY' )-0 	);
  this.rArmAxis = new point( this.rArm.getAttribute( 'rArmAxisX' )-0 , this.rArm.getAttribute( 'rArmAxisY' )-0 	);
  this.headAxis = new point( this.head.getAttribute( 'headX' )-0     , this.head.getAttribute( 'headY' )-0 	);

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

element.prototype.setPosition = function ( newPos )
{
  this.pos = newPos;
  this.SVGNode.setAttribute( 'x', newPos.x );
  this.SVGNode.setAttribute( 'y', newPos.y );
}

element.prototype.setState = function ( newState, newAnimation )
{
  this.state = newState;
  if ( newAnimation )
    this.animation = animation;
  else					//TODO make more generic
  {
    switch ( newState )
    {
      case 'moving' 	: this.animation = 'moving';	break;
      case 'mousemoving' 	: this.animation = 'moving';	break;
      default		: this.animation = 'standing';
    }
  }
}

element.prototype.animate = function ( animate )    ///Performs 'animation', or the animation corresponding to the current state if no parameters
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
    if ( this.animation == 'standing' )
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

element.prototype.move = function ( direction )	///Performs position change each frame in the given 'direction', or depending on the current movement state
{
  if ( direction && ( direction == 'up' || direction == 'down'|| direction == 'left' || direction == 'right' ) )
    this.moveDir = direction;
  {
    moveIncrements = scene.viewBoxWidth/moveSteps;
    
    if ( this.moveDir == 'up' )
      this.setPosition ( new point( this.pos.x , this.pos.y - moveIncrements ) );
    if ( this.moveDir == 'down' )
      this.setPosition ( new point( this.pos.x , this.pos.y + moveIncrements ) );
    if ( this.moveDir == 'right' )
    {
      if ( this.orientation == 'left' )
      {
// 	this.group.setAttribute( 'transform', 'scale(-1,1) translate(-51.486354,0.9105304)' );
	this.orientation = 'right';
      }
      else
	this.setPosition ( new point( this.pos.x + moveIncrements , this.pos.y ) );
    }
    if ( this.moveDir == 'left' )
    {
      if ( subject.orientation == 'right' )
      {
	this.group.setAttribute( 'transform', '' );
	this.orientation = 'left';
      }
      else
	this.setPosition ( new point( this.pos.x - moveIncrements , this.pos.y ) );
    }
  }
}

element.prototype.moveTo = function ( /*destX, destY*/ )	///Sets the direction movement and moving state until reaching (destX,destY)
{
this.setState( 'mousemoving' );
var distX = this.dest.x - this.width/2 - this.pos.x;
var distY = this.dest.y - this.height/2 - this.pos.y;

if ( distX > moveIncrements )
  this.move( 'right' );
else if ( distX < (-1)*moveIncrements )
  this.move( 'left' );
else if ( distY > moveIncrements )
  this.move( 'down' );
else if ( distY < (-1)*moveIncrements )
  this.move( 'up' );
else
  this.setState( 'standing' );
}


function doAnimations( objList )		// Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
    if ( !objList )
      for ( var i = 0 ; i < characters.length ; i++ )
	characters[i].animate();
    else
      for ( var i = 0 ; i < objList.length ; i++ )
	objList[i].animate();
}

function doMovements( objList )		// Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
    if ( !objList )
    {
      for ( var i = 0 ; i < characters.length ; i++ )
	if ( characters[i].state == 'moving')
	  characters[i].move();
    }
    else
      for ( var i = 0 ; i < objList.length ; i++ )
	if ( characters[i].state == 'moving' )
	  characters[i].move();
}

function keystop( event )
{
    if ( event.keyCode == 33 || event.keyCode == 34 )
      scene.zoomState = 'none';
    if (  event.keyCode == 37  || event.keyCode == 38  || event.keyCode == 39  || event.keyCode == 40  )
      scene.panState = 'none';
    if ( event.keyCode == 87 || event.keyCode == 83 || event.keyCode == 68 || event.keyCode == 65 )
      subject.setState ( 'standing');
    document.addEventListener( 'keydown', keyboard, false );
}

function keyboard( event )
{
    document.removeEventListener( 'keydown', keyboard, false );

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

    /****************MOVING*************************///TODO: add in a separate eventListener, depending on the subject and/or config

    if ( event.keyCode == 87 ) ///'w' UP
    {
      subject.moveDir = 'up';
      subject.setState ( 'moving' );
    }
    if ( event.keyCode == 83 ) ///'s' DOWN
    {
      subject.moveDir = 'down';
      subject.setState ( 'moving' );
    }
    if ( event.keyCode == 68 ) ///'d' RIGHT
    {
      subject.moveDir = 'right';
      subject.setState ( 'moving' );
    }
    if ( event.keyCode == 65 ) ///'a' LEFT
    {
      subject.moveDir = 'left';
      subject.setState ( 'moving' );
    }

    /*************OTHER******************************/

    if ( event.keyCode == 32 )		 ///SPACE 
      scene.focus( subject );
}

function mouse( event )   //TODO different actions for different buttons
{
//     subject.dest.x =  scene.viewBoxWidth*event.clientX/window.innerWidth + scene.scroll.x ;
//     subject.dest.y =  scene.viewBoxHeight*event.clientY/window.innerHeight + scene.scroll.y ;
    //       point = /*map.*/toMapCoordinates( event.ClientX, event.ClientY );//alert(point.x);
//     subject.animation = 'moving';
//     subject.moveTo( scene.viewBoxWidth*event.clientX/window.innerWidth + scene.scroll.x, scene.viewBoxHeight*event.clientY/window.innerHeight + scene.scroll.y );
}

function wheel ( event ) //TODO centered zoom , and mouse scroll, USE map.zoom!!!!
{
    if ( event.detail > 0 )
      scene.zoomIn();
    else
      scene.zoomOut();
}

function point( x, y )
{
    if ( x )
      this.x = x-0;
    else
      this.x = 0;
    if ( y )
      this.y = y-0;
    else
      this.y = 0;
}

point.prototype.add = function ( deltaX, deltaY )
{
    if ( deltaX ) this.x += deltaX;
    if ( deltaY ) this.y += deltaY;
    return this;
}

point.prototype.minus = function ( deltaX, deltaY )
{
    if ( deltaX ) this.x -= deltaX;
    if ( deltaY ) this.y -= deltaY;
    return this;
}

// function /*prototype.*/movement( destPoint )
// {
//     this.dest = destPoint;
// }
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/////*************************************************************************************************************\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function map( id, viewBoxCoords, viewBoxSizeX, viewBoxSizeY ) ///coordinates are CENTER of the view box
{
      if ( !id ) return;
      this.id = id;
      this.SVGNode = document.getElementById( id );
      this.SVGNode.setAttribute( 'x', 0 );
      this.SVGNode.setAttribute( 'y', 0 );
      this.SVGNode.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );  ///keep aspect ratio when stretching
      
      ////////////////////////////////
      this.zoomFactor = 0.95;
      this.maxZoom = 10;
      this.zoomState = 'none';
      this.panState = 'none';
      
      ///////////////////////////////TODO this is a problem when a this 'map' element is initialized a second time.
      
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
	  this.scroll = new point ( params[0] + this.viewBoxWidth/2, params[1] + this.viewBoxHeight/2 ) ;
	}
	else
	{
	  this.viewBoxWidth  = this.mapSizeX;
	  this.viewBoxHeight = this.mapSizeY;
	  this.adjustViewBox();
	  this.scroll = new point( this.viewBoxWidth/2, this.viewBoxHeight/2 );
	}
      }
     this.setViewBox();
}

map.prototype.adjustViewBox = function ()			 //Adjusts viewBox proportionally to the screen
{
    if  ( ( this.viewBoxWidth/this.viewBoxHeight > 1 &&  window.innerWidth/window.innerHeight < 1 ) ||
      ( this.viewBoxWidth/this.viewBoxHeight > window.innerWidth/window.innerHeight && 
      ( ( this.viewBoxWidth/this.viewBoxHeight > 1 &&  window.innerWidth/window.innerHeight > 1 ) || 
      ( this.viewBoxWidth/this.viewBoxHeight < 1 &&  window.innerWidth/window.innerHeight < 1 ) ) ) )
    {
      this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
      this.viewBoxWidth  = this.viewBoxWidth;
    }
    else
    {
      this.viewBoxWidth  = this.viewBoxHeight*window.innerWidth/window.innerHeight;
      this.viewBoxHeight = this.viewBoxHeight;
    }
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
    this.scroll = new point( newPoint.x, newPoint.y );

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
  direction =  direction || this.panState;
  if ( direction == 'down' )
    this.scroll.y += moveIncrements*this.viewBoxHeight/moveSteps*2.5;
  if ( direction == 'up' )
    this.scroll.y -= moveIncrements*this.viewBoxHeight/moveSteps*2.5;
  if ( direction == 'right' )
    this.scroll.x += moveIncrements*this.viewBoxWidth/moveSteps*2.5;
  if ( direction == 'left' )
    this.scroll.x -= moveIncrements*this.viewBoxWidth/moveSteps*2.5;
  
  this.setViewBox();
}

map.prototype.zoom = function ( newPoint, newSizeX, newSizeY )	///set camera to this position if parameters, perform zoomState otherwise.
{
  if( newPoint && newSizeX && newSizeY )
    this.setViewBox( /*new point( newPoint.x-newSizeX/2 , newPoint.y-newSizeY/2 )*/ newPoint , newSizeX, newSizeY );
  else if ( this.zoomState == 'zoomIn' )
    this.zoomIn();
  else if ( this.zoomState == 'zoomOut' )
    this.zoomOut();
}

map.prototype.focus = function ( object, level )
{
  var level = level || 5;
  var boxWidth = object.width*level;
  var boxHeight = object.height*level;
  var newPos = new point( object.pos.x, object.pos.y );
  scene.zoom( newPos, boxWidth, boxHeight );
}

map.prototype.follow = function ( object )			///Pan camera as object moves TODO test & review
{
  if ( object && object.state == 'moving' )
  {
    if ( object.pos.x - (scene.viewBoxWidth-object.width)/4.0 < scene.scroll.x )
      scene.scroll.x = object.pos.x - (scene.viewBoxWidth-object.width)/4.0;
    
    if ( object.pos.x + object.width + (scene.viewBoxWidth-object.width)/4.0 > scene.scroll.x + scene.viewBoxWidth )
      scene.scroll.x = object.pos.x + object.width + (scene.viewBoxWidth-object.width)/4.0 - scene.viewBoxWidth;
    
    if ( object.pos.y + object.height + (scene.viewBoxHeight-object.height)/4.0 > scene.scroll.y + scene.viewBoxHeight )
      scene.scroll.y = object.pos.y + object.height + (scene.viewBoxHeight-object.height)/4.0 - scene.viewBoxHeight;
    
    if ( object.pos.y - (scene.viewBoxHeight-object.height)/4.0 < scene.scroll.y )
      scene.scroll.y = object.pos.y - (scene.viewBoxHeight-object.height)/4.0;
  }
  map.zoom( object.pos, object.width*5 , object.height*5 );
}

/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/////*************************************************************************************************************\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
