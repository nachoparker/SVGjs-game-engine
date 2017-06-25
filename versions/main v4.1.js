//	TODO
//	====
//	* Batch the effect of events and movements
//	* Outer Bounding box to ease checks
//	* selecting box
//	* behaviours:
//		- all chase the same + chase in a line + rect movements,
//		-new movements: land, (also when pressing diagonal arrow movements)
//		-avoid objects and obstacles ,follow path...
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
  doMovements();
  doCollisions();
  doAnimations();
  doDrawing();
  scene.pan();
  scene.zoom();
}

function doMovements( objList )		// Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
    objList = objList || elementList;
    for ( var i = 0 ; i < objList.length ; i++ )
      objList[i].move();
}

function doCollisions( objList )
{
  objList = objList || collisionList;
  var  colPt = [];
  var  inObj = [];
  var outObj = [];

  for ( var i = 0 ; i < objList.length ; i++ )
    colPt[i] = [];

  //DETECT OVERLAP, AND CORRECT IT
  for ( var i = 0 ; i < objList.length ; i++ )
      for ( var j = i+1 ; j < objList.length ; j++ )
      {
	var colPts = objList[i].overlapPoints( objList[j] );
	if ( colPts )
	{
	  var rewindData = objList[i].rewindOnCollision( objList[j], colPts[0], colPts[1] );
	  colPt[i][j] = rewindData.colPt;

	  //Choose the inner object to decide the normal (only important for rectangle corners)
	  if( colPts[0].length >= colPts[1].length )
	  {
	     inObj[i] = objList[i];
	    outObj[i] = objList[j];
	  }
	  else
	  {
	    inObj[i] = objList[j];
	   outObj[i] = objList[i];
	  }

	  //Erase track of other collisions detected, as we are going to rewind and they won't have happened yet
	  for ( var k = 0 ; k < i ; k++ )
	    colPt[k] = [];

	  //Rewind all objects' movements to the point of this collision
	  for ( var k = 0 ; k < objList.length ; k++ )
	    if ( k != i && k != j )
	    {
	      objList[k].pos =  objList[k].pos.minus( objList[k].velocity().multiply( rewindData.rewindFraction ) );
	      objList[k].rotate ( -objList[k].angVelocity() * rewindData.rewindFraction );
	    }
	}
      }

  //SOLVE THE COLLISION
  for ( var i = 0 ; i < colPt.length ; i++ )
    for ( var j = i+1 ; j < colPt.length ; j++ )
      if ( colPt[i][j] )
	    inObj[i].elasticImpact( outObj[i], inObj[i].getShape().getNormal( colPt[i][j] ), colPt[i][j] );
}

function doDrawing( objList )
{
    objList = objList || elementList;
    for ( var i = 0 ; i < objList.length ; i++ )
    {
      objList[i].drawPosition();
      objList[i].drawRotation();
    }
}

function doAnimations( objList )		// Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
    objList = objList || animatedElementList;
    for ( var i = 0 ; i < objList.length ; i++ )
      objList[i].animate();
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
    var sinA = Math.sin( angle );
    var cosA = Math.cos( angle );
    var x = this.x*cosA - this.y*sinA ;
    var y = this.x*sinA + this.y*cosA ;
    this.x = x;
    this.y = y;
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

axes.prototype.project = function( vec, isFree )	//rotate vectors to work in the new axes
{
  if ( vec instanceof vector )
  {
    if ( isFree == false )				//consider 'vec' as a free vector or as a fixed vector
      vec = vec.minus( this.center );
    return new vector( vec.project( this.dirX ) , vec.project( this.dirY ) );
  }
}

axes.prototype.unproject = function( vec, isFree ) 	//rotate the result back to the original XY axes, assuming perpendicular axes
{
  if ( vec instanceof vector )
  {
    var result = new vector( vec.project( this.dirX.x, -this.dirX.y ) , vec.project( this.dirX.y, this.dirX.x ) );
    if ( isFree == false )				//consider 'vec' as a free vector or as a fixed vector
      result = result.add( this.center );
    return result;
  }
}

axes.prototype.rotate = function( ang )		//only the directions, does not affect the center
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
      if ( this.rotation != 0 )
	rectAxes.rotate( this.rotation );
      increment = rectAxes.project( increment );
    }
    var directions = [ false, false, false, false ];

    if ( increment.x >= 0 && increment.x < this.width/2 ) 	//right
      directions[0] = true;
    if ( increment.x < 0 && -increment.x < this.width/2 ) 	//left
      directions[1] = true;
    if ( increment.y >= 0 && increment.y < this.height/2 ) 	//beneath
      directions[2]= true;
    if ( increment.y < 0 && -increment.y < this.height/2 )	//above
      directions[3] = true;

    if ( ( directions[2] || directions[3] ) && (  directions[0] || directions[1] ) )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
	  result.push( item );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
	result.push( pt );
    }
  return result; 		// return a list of points of collision
}

rectangle.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var rectAxes = new axes( undefined, undefined, this.pos );
      if ( this.rotation != 0 )
	rectAxes.rotate( this.rotation );
      point = rectAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	vel = vel.direction();
	vel = rectAxes.project( vel );

	var slopeVel = vel.y/vel.x;
	var a = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x == 0 )			//point moved vertically, non lateral wall
	{
	  var x  = point.x;
	  if ( vel.y >= 0 )	//point moved downwards
	    var y = -this.height/2;	//top wall
	  else
	    var y = this.height/2;
	}
	else
	{
	  if ( vel.y >=0 )	//point moved downwards
	  {
	    if ( vel.x >= 0 )		//down-right
	      var x = -this.width/2;	//left wall
	    else // vel.x < 0		//down-left
	      var x = this.width/2;	//right wall
	    var y = a + slopeVel*x;
	    if ( y < -this.height/2 ) 	//no intersection, then intersection with upper wall
	    {
	      var y = -this.height/2;
	      var x = ( y - a )/slopeVel;
	    }
	  }
	  else //vel.y < 0		//point moved upwards
	  {
	    if ( vel.x >= 0 )		//up-right
	      var x = -this.width/2;	//left wall
	    else // vel.x < 0		//up-left
	      var x = this.width/2;	//right wall
	    var y = a + slopeVel*x;
	    if ( y > this.height/2 ) 	//no intersection, then intersection with bottom wall
	    {
	      var y = this.height/2;
	      var x = ( y - a )/slopeVel;
	    }
	  }
	}
	result = rectAxes.unproject( point.minus( x, y ).multiply( -1 ) );	//'result' is a distance vector, outwards from the center of the object
      }
      if ( vel.x ==0 && vel.y == 0 )	//if 'vel' is undefined or zero, locate the shortest boundary
      {
	if ( Math.abs( point.x ) >= Math.abs( point.y ) )
	{
	  if ( point.x >= 0 )					//closer to right wall
	    result = rectAxes.unproject( new vector( this.width/2 - point.x, 0 ) );
	  else							//closer to left wall
	    result = rectAxes.unproject( new vector( -this.width/2 - point.x, 0 ) );
	}
	else
	{
	  if ( point.y >= 0 )					//closer to bottom wall
	    result = rectAxes.unproject( new vector( 0 , this.height/2 - point.y ) );
	  else							//closer to top wall
	    result = rectAxes.unproject( new vector( 0 , -this.height/2 - point.y ) );
	}
      }
    }
    return result;
}

rectangle.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = angleCheck( point.minus( this.pos ).angle() - this.rotation );	//between [-PI, +PI)
      var alpha = Math.atan( this.height/this.width );				//between [0, PI/2)

      if (  ang >= -alpha && ang <= alpha )
	result = new vector( 1, 0 );
      else if (  ang > alpha && ang <= Math.PI - alpha )
	result = new vector( 0, 1 );
      else if (  ang > Math.PI - alpha || ang <= -Math.PI + alpha )
	result = new vector( -1, 0 );
      else	//(ang<-alpha && ang>-PI+alpha)
	result = new vector( 0, -1 );
      result.rotate( this.rotation );
    }
    return result;
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
    if ( increment.modulus() < this.radius )
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
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
	result.push( pt );
    }
  return result;	//  return 'undefined' or the point of collision
}

circle.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var circAxes = new axes( undefined, undefined, this.pos );
      point = circAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	vel = vel.direction();

	var slopeVel = vel.y/vel.x;
	var offset = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x != 0 )
	{
	  var a = 1 + slopeVel*slopeVel;
	  var b = 2*slopeVel*offset;
	  var c = offset*offset - this.radius*this.radius;

	  if ( vel.x > 0 )						//point moved in right direction
	    var x = ( -b - Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//leftmost point in boundary
	  else
	    var x = ( -b + Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//rightmost point in boundary

	  var y = offset + slopeVel*x;
	}
	else		//vertical movement
	{
	  if ( vel.y >= 0 )							//point moved downwards
	    var y = -Math.sqrt( this.radius*this.radius - point.x*point.x );	//top boundary
	  else
	    var y = Math.sqrt( this.radius*this.radius - point.x*point.x );	//botom boundary
	}
      }
      else		//if 'vel' is undefined or zero, locate the shortest boundary
      {
	var ang = point.angle();
	var x = this.radius*Math.cos( ang );
	var y = this.radius*Math.sin( ang );
      }
      result = circAxes.unproject( point.minus( x, y ).multiply( -1 ) );	//return an outwards vector
    }
    return result;
}

circle.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ang = point.minus( this.pos ).angle();
      result = new vector( this.radius*Math.cos( ang ) , this.radius*Math.sin( ang ) );
    }
    return result;
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
  number = number || 12;
  var points = [];
  for ( var i = 0 ; i < number ; i++ )
    points.push( new vector( this.radiusB*Math.cos(2*i*Math.PI/number) , this.radiusA*Math.sin(2*i*Math.PI/number) ) );
  return points;
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
      if ( this.rotation != 0 )
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
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle )
    for ( var i = 0 ; i < item.points.length ; i++ )
      {
	var pt = new vector ( item.points[i] );
	pt.rotate( item.rotation );
	pt = pt.add( item.pos );
	if ( this.ptsInside( pt ).length > 0 )
	  result.push( pt );
      }
  return result;		//  return 'undefined' or the point of collision
}

ellipse.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ellipseAxes = new axes( undefined, undefined, this.pos );
      if ( this.rotation != 0 )
	ellipseAxes.rotate( this.rotation );
      point = ellipseAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	vel = vel.direction();
	vel = ellipseAxes.project( vel );

	var slopeVel = vel.y/vel.x;
	var offset = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x != 0 )
	{
	  var a = 1/(this.radiusB*this.radiusB) + slopeVel*slopeVel/(this.radiusA*this.radiusA);
	  var b = 2*slopeVel*offset/(this.radiusA*this.radiusA);
	  var c = offset*offset/(this.radiusA*this.radiusA) - 1;

	  if ( vel.x > 0 )						//point moved in right direction
	    var x = ( -b - Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//leftmost point in boundary
	  else
	    var x = ( -b + Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//rightmost point in boundary

	  var y = offset + slopeVel*x;
	}
	else		//vertical movement
	{
	  if ( vel.y >= 0 )							//point moved downwards
	    var y = -this.radiusA*Math.sqrt( 1 - point.x*point.x/( this.radiusB*this.radiusB ) );	//top boundary
	  else
	    var y =  this.radiusA*Math.sqrt( 1 - point.x*point.x/( this.radiusB*this.radiusB ) );	//botom boundary
	}
      }
      else//if 'vel' is undefined or zero, approximate the closest boundary by the one in radial direction ( no exact analytical solution )
      {
	var ang = point.angle();
	var x = this.radiusB * Math.cos( ang );
	var y = this.radiusA * Math.sin( ang );
      }
      result = ellipseAxes.unproject( point.minus( x, y ).multiply(-1) );	//return an outwards vector
    }
      return result;
}

ellipse.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
  var result = undefined;
  if ( point instanceof vector )
  {
    var ang = angleCheck( point.minus( this.pos ).angle() - this.rotation );	//between [-PI, +PI)
    result = new vector( this.radiusA*Math.cos( ang ) , this.radiusB*Math.sin( ang ) );
    result.rotate( this.rotation );
  }
  return result;
}
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function rotation( angVelocity, friction )
{
  this.angVelocity = angVelocity || shiftAngle;
  this.friction = friction || 0;
}

rotation.prototype.advance = function()
{
  if ( this.friction != 0 )
    this.accelerate( -this.friction )
  return this.angVelocity;
}

rotation.prototype.isFinished = function()
{
    if ( this.angVelocity == 0 )
      return true;
    else
      return false;
}

rotation.prototype.accelerate = function ( angAcc )
{
    angAcc = angAcc || 0.005;

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


function movement ( initialDir, speed, friction )
{
    this.speed 		= speed || baseSpeed;
    this.direction 	= initialDir || new vector( 0, -1 );
    this.friction 	= friction || 0;
    this.accelState 	= 'none';
    this.cancel		= false;
    this.replace	= false;
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

function chaseMovement( owner, target, speed )
{
  rectMovement.call( this, target.pos, speed );

  this.target	= target;
  this.owner    = owner;
}
chaseMovement.prototype = new movement();
chaseMovement.prototype.constructor = movement;

chaseMovement.prototype.advance = function()
{
  var increment 	= this.target.pos.minus( this.owner.pos );
  this.direction 	= increment.direction();
  var result		= movement.prototype.advance.call( this );

  return result;
}

chaseMovement.prototype.isFinished = function ()
{
    var result = false;
    if ( this.target && this.owner.overlapPoints( this.target ) )
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

element.prototype.drawPosition = function ( newPos )
{
    if ( newPos instanceof vector )
      this.pos = newPos;

    this.SVGNode.setAttribute( 'x', this.pos.x - this.width/2  );
    this.SVGNode.setAttribute( 'y', this.pos.y - this.height/2 );
}

element.prototype.getPosition = function ()
{
  return new vector( this.pos );
}

element.prototype.rotate = function( angle )
{
  if ( angle == undefined )
    angle = 5*Math.PI/180;
  this.angle += angle;
  this.angle = angleCheck( this.angle );
}

element.prototype.drawRotation = function( angle )
{
  if ( angle != undefined )
    this.angle = angle;
  this.group.setAttribute( 'transform', 'rotate( ' + this.angle*180/Math.PI + ',' + this.width/2 + ',' + this.height/2 + ')' );
}

element.prototype.velocity = function ()
{
    if ( this.movementList[0] )
      return this.movementList[0].velocity();
    else
      return new vector( 0, 0 );
}

element.prototype.angVelocity = function ()
{
    if ( this.rotation )
      return this.rotation.angVelocity;
    else
      return 0;
}

element.prototype.pointVelocity = function( point, angVel )
//returns the velocity component of a given point due to rotation.(Assumed within the object)
{
    var d	= point.minus(  this.pos );
    var ang	= d.angle();
    var result	= new vector( -Math.sin( ang ), Math.cos( ang ) );
    angVel	= angVel || this.angVelocity();

    return result.multiply( d.modulus() * angVel );
}

element.prototype.getShape = function ( newPos, angle )		//updates the information of the bounding shape and returns it.
{
  if ( newPos instanceof vector )
    this.shape.pos = newPos;
  else
    this.shape.pos = this.pos;

  if ( angle )
    this.shape.rotation = angle;
  else
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
     if ( this.movementList[0] )
      this.movementList[0].replace = true;
     this.addMovement( newMovement );
}

element.prototype.doReplaceMovement = function()
{
      var newMovement = this.movementList[ this.movementList.length - 1 ];
      this.movementList = [];
      this.addMovement( newMovement );
      this.setState( 'moving' );
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
  if ( this.movementList[0] )
    this.movementList[0].cancel = true;
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
      if ( this.movementList[0].cancel )
	this.movementList = [];
      if ( this.movementList[0].replace )
	this.doReplaceMovement();
      if ( this.movementList[0].isFinished() )
	this.finishMovement();
      else
	this.pos = this.pos.add( this.movementList[0].advance() );
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

element.prototype.chase = function ( targetObj, accelerating, speed )
{
  if ( targetObj instanceof element && targetObj !== this )
    this.replaceMovement( new chaseMovement( this, targetObj, speed ) );
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

element.prototype.overlapPoints = function( obj )	//return the collection of intersecting points for each object, or 'undefined'
{
    var result = undefined;

    if ( obj instanceof element && this !== obj )
    {
      var thisShape = this.getShape();
      var  objShape =  obj.getShape();

      var colPts1 = thisShape.ptsInside(  objShape );
      var colPts2 =  objShape.ptsInside( thisShape );

      if ( colPts1.length > 0 || colPts2.length > 0 )
	result = [ colPts1 , colPts2 ];
    }
    return result;
}

element.prototype.rewindOnCollision = function( obj, thisPts, objPts )	//moves the objects to correct overlapping
{
    var result = undefined;
    if ( obj instanceof element && this !== obj )
    {
      if ( ( !objPts && !thisPts ) || ( objPts.length == 0 && thisPts.length == 0 ) )
      {
	var points = this.overlapPoints( obj );
	if ( points )
	{
	  thisPts = points[0];
	  objPts = points[1];
	}
      }
	//LOOK FOR THE DEEPEST POINT
	var deepestDist = 0;
	for ( var i = 0 ; i < thisPts.length ; i++ )
	{
	  var velP1 = this.pointVelocity( thisPts[i] );
	  var velP2 =  obj.pointVelocity( thisPts[i] );

	  //Total collision velocity
	  var totalVel = obj.velocity().add( velP2 ).minus( this.velocity() ).minus( velP1 );//velocity relative to 'this'

	  var overlap = this.getShape().overlapDistance( thisPts[i], totalVel );
	  var dist = overlap.modulus();
	  if (  dist > deepestDist )
	  {
	    deepestDist = dist;

	    var inObj = this;
	    var outObj = obj;
	    var colPt = thisPts[i];
	    var maxOverlap = overlap;			//relative to 'inObj' (outwards from 'inObj')
	    var colVel = totalVel;			//relative to 'inObj'
	  }
	}
	for ( var i = 0 ; i < objPts.length ; i++ )
	{
	  var velP1 = this.pointVelocity( objPts[i] );
	  var velP2 =  obj.pointVelocity( objPts[i] );

	  //Total collision velocity
	  var totalVel = obj.velocity().add( velP2 ).minus( this.velocity() ).minus( velP1 );	//velocity relative to 'this'

	  var overlap = obj.getShape().overlapDistance( objPts[i], totalVel.multiply(-1) );
	  var dist = overlap.modulus();
	  if (  dist > deepestDist )
	  {
	    deepestDist = dist;

	    var inObj = obj;
	    var outObj = this;
	    var colPt = objPts[i];
	    var maxOverlap = overlap;			//relative to 'inObj' (outwards from 'inObj')
	    var colVel = totalVel;
	  }
	}

	//PARAMETERS TO CORRECT OVERLAP
	var colSpd = colVel.modulus();
	var dist   = maxOverlap.modulus();

	if ( colSpd != 0 )
	{
	  var rewindFraction = dist/colSpd;	//represents how much we 'rewind' the movement, to the original place of collision with no overlap.

	  rewindFraction = parseFloat( ( rewindFraction + 0.00001 ).toFixed( 5 ) );	//round error correction to assure no further overlapping

	  var correct1 = inObj.velocity().multiply( rewindFraction );
	  var correct2 = outObj.velocity().multiply( rewindFraction );
	}
	else
	{
	  var rewindFraction = 0;
	  var correct1 = maxOverlap.multiply( 1/2 );
	  var correct2 = maxOverlap.multiply( -1/2 );
	}

	//CORRECT OVERLAP, REVERSING PART OF THE LAST MOVEMENT AND ROTATION
	inObj.pos  =  inObj.pos.minus( correct1 );
	outObj.pos = outObj.pos.minus( correct2 );

	inObj.rotate ( -inObj.angVelocity() * rewindFraction );
	outObj.rotate( -outObj.angVelocity() * rewindFraction );

	var colPt = colPt.minus( correct2.add( outObj.pointVelocity( colPt, -outObj.angVelocity() * rewindFraction ) ) );

	result = { 'colPt':colPt , 'rewindFraction':rewindFraction };
    }
    return result;		//return the collision point and the rewind fraction, or 'undefined'
}

element.prototype.elasticImpact = function( obj, dirN, point )	//solve impact according to surfaces, or with a wall with normal 'normalDir'
{
    // EXTRACT PARAMETERS
    var vel1 = this.velocity();
    var vel2 =  obj.velocity();
    var w1   = this.angVelocity();
    var w2   =  obj.angVelocity();

    var dirN = dirN || this.pos.minus( obj.pos );

    ///CHANGE AXES: extract the velocity in the axis parallel and normal to the collision
    var newAxes = new axes( dirN );
    var projVel1 = newAxes.project( vel1 );
    var projVel2 = newAxes.project( vel2 );

    //CALCULATE THE MOMENT ARM
    var d1 = point.minus( this.pos );
    var d2 = point.minus(  obj.pos );
    var ang1 = d1.angle( dirN.multiply(-1) );//the impulse is defined inwards to 'this' object
    var ang2 = d2.angle( dirN.multiply(-1) );
    var a1 = d1.modulus()*Math.sin( ang1 );
    var a2 = d2.modulus()*Math.sin( ang2 );

    //A) CALCULATE THE IMPULSE: to get exchange of angular and linear velocities between objects. Defined inwards to 'this' object
    //formula based in B) and in conservation of energy
    var j = -2*( projVel1.x - projVel2.x - w1*a1 + w2*a2 )/( 1/this.mass + 1/obj.mass + a1*a1/this.momInertia + a2*a2/obj.momInertia );

    //B) CALCULATE NEW VELOCITIES AND SPINS FROM IMPULSE
    var v1f = projVel1.x + j/this.mass;
    var v2f = projVel2.x - j/obj.mass;
    var w1f = w1 - j*a1/this.momInertia;
    var w2f = w2 + j*a2/obj.momInertia;

    //DETERMINE NEW VELOCITIES AND ROTATIONS IN THE ORIGINAL AXES
    var auxVel1 = new vector( v1f , projVel1.y );
    var auxVel2 = new vector( v2f , projVel2.y );

    var newVel1 = newAxes.unproject( auxVel1 );
    var newVel2 = newAxes.unproject( auxVel2 );

    this.rotation = new rotation( w1f , frictionMoment );
     obj.rotation = new rotation( w2f , frictionMoment );

    this.replaceMovement ( new movement( newVel1.direction(), newVel1.modulus(), baseAccel/2 ) );
    obj.replaceMovement  ( new movement( newVel2.direction(), newVel2.modulus(), baseAccel/2 ) );
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
      event.preventDefault();
      event.stopPropagation();
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
     if ( event.keyCode == 8 ) //'backspace' SPIN (ACCELERATE). COUNTER CLOCKWISE WITH 'SHIFT' (DECCELERATE)
     {
	if ( !event.shiftKey )
	{
	  if ( this.rotation )
	    this.rotation.accelerate( shiftAngle );
	  else
	    this.rotation = new rotation( 3*shiftAngle , 0.005 );
	}
	else
	{
	  if ( this.rotation )
	    this.rotation.accelerate( -shiftAngle );
	  else
	    this.rotation = new rotation( -3*shiftAngle , 0.005 );
	}
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
      selectAll( true );
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