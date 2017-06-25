//	FIXME
//	=====
//	* overlap/collision=> on simultaneous collisions, maxoverlap is too sometimes too low (investigate),
//	* overlap/collision=> also it gets hanged sometimes even in one-to-one collisions
//	* put parts in the quadtree separatedly, or altogether with the object??????????
//	* automatic key trigger causes tremor in oblique arrowkey movements
//
//	TODO
//	====
//	* square modulus
//	* panel and right click menus
//	* behaviours: avoid obstacles, state dependant priorities (flee!), auto-refreshing behaviours
//	* timed triggers
//	* include external SVGs - 'use or image' (no Mozilla support yet!!), coordinating from an upperlevel XHTML document or using AJAX
//	* XML configuration file
//	* resize event
//

addEventListener( 'load', init, false );

function init()
{
  svgMain = document.getElementById( 'svgMain' );

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
  scene = allList.find( map, 'main' )[0];

  collisionTree = new quadTreeNode( elementList.concat( scene.sceneItems ), scene.mapSizeX, scene.mapSizeY  );
  collisionTree.buildTree( /*1, 0*/ );

//   subject = characterList.search( 'subject' );

  ///error check
  if ( !scene ) return;

  selectBox = new selectionBox();
  svgMain.setAttribute( 'overflow' , 'visible' );
  svgMain.setAttribute( 'shape-rendering' , 'optimizeSpeed' );
  svgMain.setAttribute( 'image-rendering' , 'optimizeSpeed' );
//   svgMain.setAttribute( 'text-rendering' , 'optimizeSpeed' );

  //SET GLOBAL EVENTS
  document.addEventListener( 'keydown', 	keyDown, false );
  document.addEventListener( 'mouseup', 	mouseUp, false );
  document.addEventListener( 'contextmenu', 	function(e){ e.stopPropagation();e.preventDefault(); return false}, false );

  setInterval( 'mainLoop()', 50 );
}

  //GENERAL CONFIGURATION

  photogramsPerCycle = 10;
  panSteps = 50;
  shiftAngle = 5*Math.PI/180;
  frictionMoment = 0.005;
  baseSpeed = 5;
  baseAccel = 0.5;

function getNodeList( attribute, value, tagName )	///get SVG nodes with that 'attribute' that match 'value', or all if no 'value'. All SVGs if no 'attribute'.
{
    var SVGlist = document.getElementsByTagName( tagName || 'svg' );
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

function getList( attribute, value, tagName )  ///Returns list of objects, each one of its correct object type. List contains 'attribute=value', 'attribute'=(any)', or all SVGs.
{
  var list = [];
  var nodeList = getNodeList( attribute, value, tagName ); 	//gets all SVGs if no attribute, all of kind 'attribute' if no 'value'

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
    else if ( nodeList[i].getAttribute( 'panel' ) )
      list.push( new panel( nodeList[i].getAttribute( 'id' ) ) );

  return list;
}

function pathIsValidPolygon( SVGNodePath )	//we assume the polygon is described by a SVG closed <PATH> without arcs or bezier curves
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
      var firstPt = txtPoints[1].split( ',' );			//the first point is the absolute position, all the others are relative to this one
      points[0] = new vector( parseFloat( firstPt[0] ) , parseFloat( firstPt[1] ) );

      //INCREMENTAL OR ABSOLUTE MODE
      if ( txtPoints[0] == 'm' )	//incremental mode
	var a = 1;
      else // 'M' absolute mode
	var a = 0;

      for ( var i = 2 ; i < txtPoints.length - 2 ; i++ )		//get rid of the 'm' and the 'z', don't count the first, or the last one that closes (= to the first)
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

    var j=0;
    for ( var i = 0 ; i < this.length ; i++ )
      if ( ( !class || this[i].constructor == class  ) && ( !type || this[i].type == type ) )
	returnList.push( this[i] );
    return returnList;
}

//////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

function mainLoop()
{
  doBehaviours();
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

function doDrawing( objList )
{
  objList = objList || elementList;
  for ( var i = 0 ; i < objList.length ; i++ )
  {
    if ( objList[i].movementList[0] )
      objList[i].drawPosition();
    if ( objList[i].rotation )
      objList[i].drawRotation();
  }
}

function doAnimations( objList )		// Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
  objList = objList || animatedElementList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].animate();
}

function doBehaviours( objList )		// Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
  objList = objList || elementList;
  for ( var i = 0 ; i < objList.length ; i++ )
    objList[i].doBehaviour();
}

function doCollisions( colTree )
{
 // doDrawing();//TODO
  colTree = colTree || collisionTree;
  colTree.update();
  var node = colTree.firstLeaf();

  var collisionInfo = undefined;		//object that contains all the information about the collision
  var maxOverlap = 0;

  //A) DETECT OVERLAP
  while( node != undefined )
  {
    for ( var i = 0 ; i < node.elements.length ; i++ )
      for ( var j = i+1 ; j < node.elements.length ; j++ )
	if ( ( ( node.elements[i].movementList && node.elements[i].movementList[0] ) || node.elements[i].rotation	//check that at least one is moving or rotating
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
    for ( var n = 0 ; n < colTree.elements.length ; n++ )	//Rewind all objects' movements to the point of the first collision
      if ( colTree.elements[n] instanceof element )
      {
	if ( colTree.elements[n].movementList[0] )
	{
	  colTree.elements[n].pos =  colTree.elements[n].pos.minus( colTree.elements[n].velocity().multiply( collisionInfo.overlapFraction ) );
// 	  colTree.elements[n].drawPosition();
	}
	if ( colTree.elements[n].rotation )
	{
	  colTree.elements[n].rotate ( -colTree.elements[n].angVelocity() * collisionInfo.overlapFraction );
// 	  colTree.elements[n].drawRotation();
	}
      }
    //B2) SOLVE THE (first) COLLISION
      elasticImpact( collisionInfo.inObj, collisionInfo.outObj, collisionInfo.inPart.getShape().getNormal( collisionInfo.colPt ), collisionInfo.colPt );
//     collisionInfo.inObj.collisionTrigger( collisionInfo.outObj, collisionInfo );
//     collisionInfo.outObj.collisionTrigger( collisionInfo.inObj, collisionInfo );

    //B3) CONTINUE THE REST OF THE MOVEMENT FOR THIS FRAME INTERVAL
    for ( var n = 0 ; n < colTree.elements.length ; n++ )
      if ( colTree.elements[n] instanceof element )
      {
	if ( colTree.elements[n].movementList[0] )
	{
	  colTree.elements[n].pos =  colTree.elements[n].pos.add( colTree.elements[n].velocity().multiply( collisionInfo.overlapFraction ) );
// 	  colTree.elements[n].drawPosition();
	}
	if ( colTree.elements[n].rotation )
	{
	  colTree.elements[n].rotate ( colTree.elements[n].angVelocity() * collisionInfo.overlapFraction );
	//colTree.elements[n].drawRotation();
	}
      }
    //B4) CHECK AGAIN for new collisions during the rest of the frame interval
    doCollisions();
  }
}

function quadTreeNode ( objList, mapWidth, mapHeight, parentNode, coordinate , x, y, depth, maxDepth, maxOcupation )
{
  //STRUCTURE
  this.elements = objList.slice();
  this.parentNode = parentNode;
  this.coordinate = coordinate;
  this.childNodes = [];

  //SPLITTING POLICY
  this.maxDepth = maxDepth || 3;				//4^3 = 64 subdivisions
  this.maxOcupation = maxOcupation || 1;

  //STATE INFORMATION
  this.depth = depth || 0;
  this.x = x || 0;
  this.y = y || 0;
  this.mapWidth = mapWidth;
  this.mapHeight = mapHeight;
}

quadTreeNode.prototype.firstLeaf = function()				//returns a pointer to the first leaf node in the subtree
{
  var node = this;
  while ( node.childNodes.length > 0 )
    node = node.childNodes[0];
  return node;
}

quadTreeNode.prototype.nextLeaf = function()				//returns a pointer to the next leaf node in the subtree ('undefined' if this was the last)
{
  if ( this.coordinate < 3 )
    return this.parentNode.childNodes[ this.coordinate + 1 ];
  else if ( this.coordinate == 3 )
  {
    var node = this.parentNode.nextLeaf();
    if ( node != undefined )		//if parent is the root node, then we are finished
      return node.firstLeaf();
  }
  return undefined;			//in case we are in the root node there is no 'next leaf'
}

quadTreeNode.prototype.corresponds = function( element )
{
  return ( ( ( element.pos.x + element.BBox.width/2 <= this.x + this.mapWidth && element.pos.x + element.BBox.width/2 >= this.x )
	|| ( element.pos.x - element.BBox.width/2 <= this.x + this.mapWidth  && element.pos.x - element.BBox.width/2 >= this.x ) )
      && ( ( element.pos.y + element.BBox.height/2 <= this.y + this.mapHeight && element.pos.y + element.BBox.height/2 >= this.y )
	|| ( element.pos.y - element.BBox.height/2 <= this.y + this.mapHeight && element.pos.y - element.BBox.height/2 >= this.y ) ) );
}

quadTreeNode.prototype.split = function()			//divide the node in four quadrants and populate them with the according elements
{
  this.childNodes = [];
  var qTable = [];
  qTable[0] = [];		//first quadrant: TOP LEFT
  qTable[1] = [];		//second quadrant: TOP RIGHT
  qTable[2] = [];		//third quadrant: BOTTOM LEFT
  qTable[3] = [];		//fourth quadrant: BOTTOM RIGHT

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
  if ( this.elements.length > this.maxOcupation && this.depth < this.maxDepth )		//conditions to continue division
  {
    this.split();									//subdivide into four new quadrants
    for ( var i = 0 ; i < 4 ; i++ )							//build tree on each one of them
      this.childNodes[i].buildTree( maxOcupation, maxDepth );
  }
}

quadTreeNode.prototype.insertElement = function( element )//insert the element in a node and update its subtree, if appropriate. (This doesn't update parent nodes)
{
  if ( this.corresponds( element ) )
  {
    this.elements.push( element );
    if ( this.childNodes.length > 0 )		//non-leaf node: place in the corresponding childen node(s) recursively
      for ( var i = 0 ; i < this.childNodes.length ; i++ )
	this.childNodes[i].insertElement( element );
    else					//leaf node: check if further splitting is necessary
      this.buildTree();
  }
}

quadTreeNode.prototype.removeElement = function( element )	//remove the element from a node and all its subtree
{
  if ( this.corresponds( element ) )
    for ( var j = 0 ; j < this.elements.length ; j++ )
      if ( element === this.elements[j] )
      {
	this.elements.splice( j, 1 );				//remove it
	if ( this.elements.length <= this.maxOcupation )	//check if its leafs should be merged
	  this.childNodes = [];
	for ( var i = 0 ; i < this.childNodes.length ; i++ )	//otherwise, continue removing further down
	  this.childNodes[i].removeElement( element );
	j = this.elements.length;			//finish (assume no duplicated elements)
      }
}

quadTreeNode.prototype.update = function( objList )
{
  objList = objList || elementList;
  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i].movementList[0] )
    {
      this.removeElement( objList[i] );
      this.insertElement( objList[i] );
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function overlapPoints ( obj1, obj2 )	//return the collection of intersecting points for each object, or 'undefined'
{
  var result = undefined;

  if ( obj1 && obj2 && obj1 !== obj2 )
  {
    if ( obj1 instanceof rectangle )	//to be used with bounding boxes, for simplicity
      var obj1Shape = obj1;
    else
      var obj1Shape = obj1.getShape();
    if ( obj2 instanceof rectangle )	//to be used with bounding boxes, for simplicity
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

function calculateOverlap ( obj1, obj2, obj1Pts, obj2Pts )	//moves the two objects to correct overlapping
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
	var dist = overlap.modulus();
	if (  dist > deepestDist )
	{
	  deepestDist = dist;

	  var inObj = obj1;
	  var outObj = obj2;
	  var colPt = obj1Pts[i];
	  var maxOverlap = overlap;			//relative to 'inObj' (outwards from 'inObj')
	  var colVel = totalVel;			//relative to 'inObj'
	}
      }
      for ( var i = 0 ; i < obj2Pts.length ; i++ )
      {
	var velP1 = obj1.pointVelocity( obj2Pts[i] );
	var velP2 = obj2.pointVelocity( obj2Pts[i] );

	//Total collision velocity
	var totalVel = obj2.velocity().add( velP2 ).minus( obj1.velocity() ).minus( velP1 );	//velocity relative to 'obj1'

	var overlap = obj2.getShape().overlapDistance( obj2Pts[i], totalVel.multiply(-1) );
	var dist = overlap.modulus();
	if (  dist > deepestDist )
	{
	  deepestDist = dist;

	  var inObj = obj2;
	  var outObj = obj1;
	  var colPt = obj2Pts[i];
	  var maxOverlap = overlap;			//relative to 'inObj' (outwards from 'inObj')
	  var colVel = totalVel;
	}
      }

      //PARAMETERS TO CORRECT OVERLAP
      var colSpd = colVel.modulus();
      var dist   = maxOverlap.modulus();

      if ( colSpd != 0 )
      {
	var overlapFraction = dist/colSpd;	//represents how much we 'rewind' the movement, to the original place of collision with no overlap.

	overlapFraction = parseFloat( ( overlapFraction + 0.00001 ).toFixed( 5 ) );	//round error correction to assure no further overlapping

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
  return result;		//return the collision point and the rewind fraction, or 'undefined'
}

function elasticImpact ( obj1, obj2, dirN, point )	//solve impact according to surfaces, or with a wall with normal 'normalDir'
{
    // EXTRACT PARAMETERS
    if ( obj1.velocity )
      var vel1 = obj1.velocity();
    else
      var vel1 = new vector( 0 , 0 );
    if ( obj2.velocity )
      var vel2 = obj2.velocity();
    else
      var vel2 = new vector( 0 , 0 );

    if ( obj1.angVelocity )
      var w1 = obj1.angVelocity();
    else
      var w1 = 0;
    if ( obj2.angVelocity )
      var w2 = obj2.angVelocity();
    else
      var w2 = 0;

    var m1   = obj1.mass || Infinity;
    var m2   = obj2.mass || Infinity;
//     var moi1 = obj1.momInertia || Infinity;
//     var moi2 = obj2.momInertia || Infinity;
     var moi1 = Infinity;//TODO
    var moi2 = Infinity;

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

      if ( obj1 instanceof element )
      {
	obj1.replaceMovement ( new movement( obj1, newVel1.direction(), newVel1.modulus(), baseAccel/2, false ) );
	obj1.doMovAction();
	if ( w1f != 0 )
	  obj1.rotation = new rotation( w1f , frictionMoment );
	else
	  obj1.rotation = undefined;
      }

      if ( obj2 instanceof element )
      {
	obj2.replaceMovement ( new movement( obj2, newVel2.direction(), newVel2.modulus(), baseAccel/2, false ) );
	obj2.doMovAction();
	if ( w2f != 0 )
	  obj2.rotation = new rotation( w2f , frictionMoment );
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

vector.prototype.angle2 = function( vec )		//returns the angle with X axis, or with vector, defined between [0, +2PI)
{
    if ( vec instanceof vector )
      var value = angleCheck2( vec.angle() - this.angle() );
    else
    {
      if ( this.x < 0 )
	var shift = Math.PI;
      else
	var shift = 0;
      var value = ( shift + Math.atan( this.y/this.x ) );		//values between [-PI/2, 3*PI/2)

      if ( value < 0 )					//correct the range [-PI/2, 0)
	value += 2*Math.PI;
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

function angleCheck2( ang )					//makes sure an angle is expressed between [0,2PI)
{
  ang = ang % (2*Math.PI);					//values between [-2*PI/2, +2*PI)
  if ( ang < 0 )					//correct the range [-2PI, 0)
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
    if ( angle == undefined )
      angle = shiftAngle;
    if ( angle != 0 )
    {
      var sinA = Math.sin( angle );
      var cosA = Math.cos( angle );
      var x = this.x*cosA - this.y*sinA ;
      var y = this.x*sinA + this.y*cosA ;
      this.x = x;
      this.y = y;
    }
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
  return result; 		// return a list of points of collision
}

rectangle.prototype.areaInertia = function()
{
  return ( this.width*this.width + this.height*this.height )/12;
}

rectangle.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var rectAxes = new axes( undefined, undefined, this.pos );
      rectAxes.rotate( this.rotation );
      point = rectAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
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

function polygon( points )		//The polygon MUST be "monotone convex"
{
  this.rotation = 0;
  this.points = points.slice();
  this.faces = [];					//list of tangent vectors, ordered in counter-clockwise direction from points[0]
  this.normals = [];					//list of OUTER normal vectors,  ordered in counter-clockwise direction from points[0]

  //SET POINTS AROUND CENTER (ASSUMED AXES LOCATED IN TOP LEFT CORNER)
  this.pos = new vector( this.getWidth()/2 + leftMostX( this.points ) , this.getHeight()/2 + upMostY( this.points ) );
  for ( var i = 0 ; i < this.points.length ; i++ )
     this.points[i] = this.points[i].minus( this.pos );

  //CALCULATE SIDES
  for ( var i = 0 ; i < this.points.length -1 ; i++ )
    this.faces[i] = this.points[ i + 1 ].minus( this.points[i] );
  this.faces[ this.points.length -1 ] = this.points[0].minus ( this.points[ this.points.length -1 ] );

  //ORDER POINTS CLOCKWISELY

    //angles between vectors representing the faces
    var vecAng = [];
    for ( var i = 0 ; i < this.faces.length - 1 ; i++ )
      vecAng[i] = this.faces[i].angle( this.faces[ i + 1 ] );
    vecAng[ this.faces.length - 1 ] = this.faces[ this.faces.length - 1 ].angle( this.faces[ 0 ] );	//> 0 clockwise, < 0 counter-clockwise

    //check if the polygon is drawn clockwise or counter-clockwise
    var sum = 0;
    for ( var i = 0 ; i < vecAng.length ; i++ )
      sum += vecAng[i];											//> 0 clockwise, < 0 counter-clockwise

    //make it counter-clockwise
    if ( sum > 0 )
      this.points.reverse();

    //begin with the point of max angle ( for getNormal() )
    var maxAng = -Infinity;
    var maxIndex = 0;
    for ( var i = 0 ; i < this.points.length ; i++ )	//look for the minimum
    {
      var ang = this.points[i].angle2();
      if ( ang > maxAng )
      {
	maxAng = ang;
	maxIndex = i;
      }
    }
    for ( var i = 0 ; i < maxIndex ; i++ )	//reorder
      this.points.push( this.points.shift() );	//put the first ones at the end

  //RE-CALCULATE SIDES
  for ( var i = 0 ; i < this.points.length -1 ; i++ )
    this.faces[i] = this.points[ i + 1 ].minus( this.points[i] );
  this.faces[ this.points.length -1 ] = this.points[0].minus ( this.points[ this.points.length -1 ] );

  //CALCULATE OUTER NORMALS
  for ( var i = 0 ; i < this.faces.length ; i++ )
    this.normals[i] = new vector( -this.faces[i].y, this.faces[i].x );
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
  for ( var i = 0 ; i < this.points.length - 1 ; i++ )
    Area += this.points[i].modulus()*this.points[i+1].modulus()*Math.abs( Math.sin( this.points[i].angle( this.points[i+1] ) ) );
  Area += this.points[0].modulus()*this.points[this.points.length-1].modulus()*Math.abs( Math.sin( this.points[0].angle( this.points[this.points.length-1] ) ) );
  return Area/2;
}

polygon.prototype.areaInertia = function()//Calculation as the addition of triangles, assuming CONCAVE, and center of mass/rotation the center of the bounding box.
{
  //Areas of the triangles (between center and vertices)
  var Area = [];
  for ( var i = 0 ; i < this.points.length - 1 ; i++ )
    Area[i] = this.points[i].modulus()*this.points[i+1].modulus()*Math.abs( Math.sin( this.points[i].angle( this.points[i+1] ) ) );
  Area[this.points.length-1] = this.points[0].modulus()*this.points[this.points.length-1].modulus()*Math.abs( Math.sin( this.points[0].angle( this.points[this.points.length-1] ) ) );

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
  var angles = angleCheck( angleList ) || this.getAngles();
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
    var pt = polyAxes.project( item, false );		//as fixed vector

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
  return result; 		// return a list of points of collision
}

polygon.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var polyAxes = new axes( undefined, undefined, this.pos );
      polyAxes.rotate( this.rotation );
      point = polyAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	if ( vel.x != 0 )		//nonvertical velocity
	{
	  vel = polyAxes.project( vel );
	  var slopeVel	= vel.y/vel.x;
	  var aV = point.y - slopeVel*point.x;

	  for ( var i = 0 ; i < this.points.length ; i++ )
	    if ( vel.project( this.normals[i] ) < 0 )			//condition for a face to have been crossed by the point with this velocity
	    {
	      //CALCULATE INTERSECTION WITH EACH SEGMENT'S RECT
	      if ( this.faces[i].x != 0 )	//nonvertical face
	      {
		var slopeFace = this.faces[i].y/this.faces[i].x;
		var aF = this.points[i].y - slopeFace*this.points[i].x;
		var x = ( aV - aF )/( slopeFace - slopeVel );
		var y = aV + slopeVel*x;
	      }
	      else	//vertical face, nonvertical velocity
	      {
		var aV = point.y - slopeVel*point.x;
		var x = this.points[i].x;
		var y = aV + slopeVel*x;
	      }
	      ///CHECK THAT THE POINT IS IN THE SEGMENT
	      if ( i < this.points.length - 1 )
		if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
		  ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
		  i = this.points.length;	//exit loop, we found the desired point
	    }
	}
	else //vertical velocity
	  for ( var i = 0 ; i < this.points.length ; i++ )
	    if ( vel.project( this.normals[i] ) < 0 && this.faces[i].x != 0 )			//condition for a face to have been crossed by the point with this velocity
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
		  i = this.points.length;	//exit loop, we found the desired point
	    }

	result = polyAxes.unproject( point.minus( x, y ).multiply( -1 ) );	//'result' is a distance vector, outwards from the center of the object
      }
      if ( vel.x ==0 && vel.y == 0 )	//if 'vel' is undefined or zero, locate the shortest boundary
      {
	var p = [];
	for ( var i = 0 ; i < this.points.length ; i++ )
	{
	  if ( this.faces[i].x != 0 && this.faces[i].y != 0  )	//non-vertical, non-horizontal face
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
	  else 				//horizontal face
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
	result = polyAxes.unproject( incrMin.multiply( -1 ) );	//'result' is a distance vector, outwards from the center of the object
      }
    }
    return result;
}

polygon.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = angleCheck2( point.minus( this.pos ).angle2() - this.rotation );	//between [0, 2PI)
      var alpha = [];
      for ( var i = 0 ; i < this.points.length ; i++ )
	alpha[i] = this.points[i].angle2();						//between [0, 2PI)

      for ( var i = 0 ; i < alpha.length - 1 ; i++ )
	if (  ang <= alpha[i] && ang > alpha[i+1] )
	  result = new vector( this.normals[i] );
      if (  result == undefined )
	result = new vector( this.normals[ alpha.length - 1 ] );
      result.rotate( this.rotation );
    }
    return result;
}

polygon.prototype.getAngles  = function ()	//retreive the INNER angles between the sides of the polygon. Angles between ( 0 , 2PI )
{
  var angList = [];
  for ( var i = 0 ; i < this.faces.length - 1 ; i++ )		//the angle between two segments is the complementary to the angle between vectors
    angList.push( Math.PI + this.faces[i].angle( this.faces[ i + 1 ] ) );
  angList.push( Math.PI + this.faces[ this.faces.length - 1 ].angle( this.faces[ 0 ] ) );
  return angList;
}

polygon.prototype.splitPolygon = function ( clockwise , startIndex, jump )	//split into a set of concave polygons. Returns the list of polygons
{
  var polygonList = [];

  if ( clockwise == undefined )
    clockwise = false;
  if ( jump == undefined )
    jump = false;

  var points = this.points.slice();
  var angles = this.getAngles();

  //REORDER IF IN CLOCKWISE CASE: 'S' patterns fail in one direction, but not in the other
  if ( clockwise )
  {
    points.reverse();
    points.unshift( points.pop() ); 			//put last one first
    angles.reverse();
    angles.push( angles.shift() );//angles.push( angles.shift() );		 //put first one last (twice)
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
      points.push( points.shift() );	//put the first ones at the end
      angles.push( angles.shift() );
    }
  }
  else	// BEGIN WITH THE GIVEN ANGLE
  {
    if ( clockwise )
      startIndex = points.length - startIndex;
    for ( var i = 0 ; i < startIndex ; i++ )
    {
      points.push( points.shift() );	//put the first ones at the end
      angles.push( angles.shift() );
    }
    while( angles[0] > Math.PI )	//look for the closest last concave
    {
      points.push( points.shift() );	//put the first ones at the end
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
	newAng = Math.PI + points[i+1].minus( points[i] ).angle( points[0].minus( points[i+1] ) );	//angle if we closed the polygon here
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
      while( !failure && P1.ptsInside( points2.slice( 1 ) ).length > 0  )	//don't count the first point of P2, as it is shared with P1
      {
	if ( P1.points.length > 3 )
	{
	  points1.pop();						//remove the last point of P1 (that is shared with P2)
	  points2.unshift( points1[ points1.length - 1 ] );	//make P2 begin in the new last point of P1 (so that they share it)
	  P1 = new polygon( points1 );
	}
	else
	{
	  failure = true;	//if it is reduced to a triangle and there is still overlap, the algorithm has failed -> solve clockwise
	  P1 = undefined;
	}
      }

      //SAVE POLYGON P1 AND CONTINUE DIVIDING P2
      if ( !failure )
      {
	P1.pos = this.pos.add( P1.pos );				//P1 and P2 are initialized respect to the coordinates of the original polygon
	polygonList.push( P1 );

	var P2 = new polygon( points2.concat( points[0] ) );	//close P2 with the first point of P1
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
	else	//'SADDLE' POINT: jump to next concave point and begin again
	{
	  var index = 0;
	  for ( var j = 0 ; j < angles.length ; j++ )	//look for the next concave point
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
      i = angles.length;	//exit loop
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
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
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

circle.prototype.areaInertia = function()
{
  return ( this.radius*this.radius )/2;
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
  return result;		//  return 'undefined' or the point of collision
}

ellipse.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ellipseAxes = new axes( undefined, undefined, this.pos );
      ellipseAxes.rotate( this.rotation );
      point = ellipseAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
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

function rotation( angVelocity, friction, targetAngle )
{
  if ( angVelocity == undefined )
    angVelocity = shiftAngle;
  this.angVelocity = angVelocity;
  this.friction = friction || 0;
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

function movement ( owner, initialDir, speed, friction, oriented, pauseBehaviours )
{
  this.owner = owner;

  //PARAMETERS
  if ( initialDir )
    this.direction = new vector( initialDir );
  else
    this.direction = new vector( 0, -1 );
  this.direction = this.direction.direction();
  this.friction = friction || 0;
  if ( oriented == undefined )
    oriented	= true;
  this.oriented = oriented;			//indicates if the orientation of the element is to be the same as the direction of movement
  if ( pauseBehaviours == undefined )
    pauseBehaviours = true;
  this.pauseBehaviours = pauseBehaviours;	//marks the movement as belonging to a behaviour
  this.speed = speed;				//this is the proposed speed, 'undefined' means use current speed

  //SCHEDULED ACTIONS
  this.add	= false
  this.cancel	= false;
  this.replace	= false;

  //COMPONENTS
  this.components = [];		//list with extra components to the movement, to add vectorially
  this.weight	  = 1;		//default weight to average when it is used as the component of a complex movement

  //RANDOM CHARACTERISTICS
  this.RAngle	= undefined;
  this.RCurv	= undefined;
  this.RSpeed	= undefined;
}

element.prototype.velocity = function ()
{
  if ( this.nextMovAction.nextMovement )
    return this.nextMovAction.nextMovement.direction.multiply( this.speed );
  else if ( this.movementList[0] )
    return this.movementList[0].direction.multiply( this.speed );
  else
    return new vector( 0 , 0 );
}

movement.prototype.advance = function () ///Returns the increment for each frame
{
  //Friction
  if ( this.friction > 0 )	//none
    this.owner.deccelerate( this.friction );
  //Random components
  if ( this.RSpeed || this.RCurv || this.RAngle )
    this.randomize();
  if ( this.RCurv )
    this.direction.rotate( this.curvature*this.owner.speed );

  //Movement itself
  if ( this.components.length == 0 )
    var result = this.direction.multiply( this.owner.speed );
  else
  {	//AVERAGE COMPONENTS - add unitary vectors weighted
    var result = this.direction.multiply( this.weight );	//this component

    for ( var i = 0 ; i < this.components.length ; i++ )
    {
      this.components[i].advance();
      result = result.add( this.components[i].direction.multiply( this.components[i].weight ) );	//add each component, with modulus one and scaled by the weight
    }

    var mod = result.modulus();
    if ( mod != 0 )
      result = result.multiply( this.owner.speed/mod );	//make modulus one and scale by element's speed
    else
      result = new vector( 0 , 0 );
  }

  return result;
}

movement.prototype.isFinished = function ()
{
  if ( this.owner.speed == 0 )
    return true;
  else
    return false;
}

function arrowMovement ( owner, dir, speed, friction )
{
  this.up 	= false;
  this.down  	= false;
  this.right	= false;
  this.left	= false;

  movement.call( this, owner, undefined, speed, friction );
  this.addDir( dir );
}
arrowMovement.prototype = new movement();
arrowMovement.prototype.constructor = arrowMovement;

arrowMovement.prototype.addDir = function( dir, add )		//add/substract a component to the movement and return resulting direction
{
  if ( add == undefined )
    add = true;
  if ( dir )
  {
    if ( dir == 'up' )
      this.up = add;
    else if ( dir == 'down' )
      this.down = add;
    else if ( dir == 'right' )
      this.right = add;
    else if ( dir == 'left' )
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

function rectMovement( owner, position, speed )
{
  movement.call( this, owner, undefined, speed );

  if ( this.owner )
  {
    this.targetPos = position || new vector();
    this.increment = this.targetPos.minus( this.owner.pos );
    this.direction = this.increment.direction();
  }
}
rectMovement.prototype = new movement();
rectMovement.prototype.constructor = movement;

rectMovement.prototype.advance = function()
{
  this.direction = this.increment.direction();
  var result	 = movement.prototype.advance.call( this );
  return result;
}

rectMovement.prototype.isFinished = function ()
{
  var result = false;
  this.increment = this.targetPos.minus( this.owner.pos );
  if ( this.increment.modulus() <= this.owner.speed )
  {
    this.owner.pos = new vector( this.targetPos );
    result = true;
  }
  return result;
}

function landMovement( owner, destPos, speed )			//movement with a constant decceleration that ends in the destination with velocity 0
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

function softMovement( owner, destPos, speed, dist ,percentage )	//hybrid movement:'rect' movement that, at a certain point becomes a land movement
{
  this.targetPos = destPos || new vector();
  this.increment = this.targetPos.minus( owner.pos );
  movement.call( this, owner, this.increment, speed );

  this.landing  = false;
  this.distOrig	= this.targetPos.minus( this.owner.pos ).modulus();
  this.distChange = dist || 20;			//indicates the max distance to destination point to begin 'landing'
  this.percentage = percentage || 0.9;		//indicates the max percentage point of the movement to begin 'landing' (default: 90%)
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

softMovement.prototype.cancelLand = function()	//cancel landing (becomes a rect movement), to use in a sequence of movements for all except the last one
{
  this.distChange = 0;
  this.percentage = 1;
  this.noLand = true;
}

softMovement.prototype.isFinished = function()	//cancel landing (becomes a rect movement), to use in a sequence of movements for all except the last one
{
  if( this.noLand )
  {
    var increment = this.targetPos.minus( this.owner.pos );
    if ( increment.modulus() <= this.owner.speed )
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
//   this.radius 		= this.distance/2; //Max curvature. input radius for more complexity?
//   this.arch		= this.radius*Math.PI;
//   this.steps 		= this.arch/this.owner.speed;
//   this.curvature	= Math.PI/this.steps;
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

function carMovement( owner, initialDir, speed )
{
  movement.call( this, owner, initialDir, speed, baseAccel/2 );
  this.steerState = 0;					// 0 - none, 1 - steer right , 2 - steer left
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
  if ( this.target && overlapPoints( this.owner , this.target ) )
    result = true;

  return result;
}

function fleeMovement( owner, target, speed )
{
  movement.call( this, owner, target.pos, speed );
  this.target	= target;
}
fleeMovement.prototype = new movement();
fleeMovement.prototype.constructor = movement;

fleeMovement.prototype.advance = function()
{
  var increment 	= this.target.pos.minus( this.owner.pos );
  this.direction 	= increment.direction().multiply( -1 );
  var result		= movement.prototype.advance.call( this );
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

function part( id , parentElement, shape, coordinates )	//geometric shape that is component of an element (it is attached to the element)
{
  this.parentElement = parentElement;
  if ( id )				//indicates that the information is to be extracted from the SVG document, otherwise from the 'shape' parameter
  {
    this.SVGNode = document.getElementById( id );
    this.id = id;
  //   this.SVGNode.setAttribute( 'display' , 'none' );TODO

    //DIMENSIONS
    this.height = this.SVGNode.getAttribute( 'height' );
    if ( this.height == undefined || this.height == '100%' )
    {
        this.height = this.parentElement.SVGNode.getAttribute( 'height' );
	if ( this.height == undefined || this.height == '100%' )
	  this.height = 10.0;
    }
    this.height = parseFloat( this.height );

    this.width	= this.SVGNode.getAttribute( 'width' );
    if ( this.width == undefined || this.width == '100%' )
    {
        this.width = this.parentElement.SVGNode.getAttribute( 'width' );
	if ( this.width == undefined || this.width == '100%' )
	  this.width = this.height*window.innerWidth/window.innerHeight;
    }
    this.width = parseFloat( this.width );
    this.angle 	= Math.PI/180*parseFloat( this.SVGNode.getAttribute( 'rotation' ) ) || parentElement.angle || 0;

    ///LOCATION - the part coordinates are considered relative to the element, unless the element has no 'xy' parameters defined in the SVG document
    if ( coordinates )
      this.pos = coordinates;								//center of the object
    else
    {
      var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || 0;			//'SVG coords' are top-left corners
      var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || 0;
      this.pos = new vector( readX + this.width/2, readY + this.height/2 );		//center of the object
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

    this.angle 	= parentElement.angle || 0;
    this.pos 	= coordinates || new vector( this.width/2, this.height/2 );
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
      this.height = this.shape.getHeight();					//only the polygon does not need manual description in the 'width,'height', fields
      this.width  = this.shape.getWidth();
      this.pos = new vector( this.shape.pos );
    }
    //B) no parameter node (ie. 'id' is undefined), and only element in the SVG parent node is a valid 'path'
    else if( this.parentElement.group.childElementCount == 1
          && this.parentElement.group.firstElementChild.nodeName == 'path' && pathIsValidPolygon( this.parentElement.group.firstElementChild ) )
    {
      this.shape = shape || new polygon( pointsFromPath( this.parentElement.group.firstElementChild ) );
      this.height = this.shape.getHeight();					//only the polygon does not need manual description in the 'width,'height', fields
      this.width  = this.shape.getWidth();
      this.pos = new vector( this.shape.pos );
    }
  //Otherwise, default to rectangle
  else
    this.shape = shape || this.getRectangle();
}

part.prototype.getShape = function ( newPos, angle )		//updates the information of the part's shape and returns it.
{
  if ( newPos instanceof vector )
    this.shape.pos = newPos;
  else
    this.shape.pos = this.parentElement.pos.add( this.pos );		//global coordinates

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

element.prototype.momentInertia = function ()
{
  var sum = 0;
  for ( var i = 0 ; i < this.parts.length ; i++ )
    sum += this.parts[i].pos.modulus()*this.parts[i].pos.modulus() + this.parts[i].shape.areaInertia();	//parallel axes theorem centered in the element's axes
  return sum*this.mass;		//the density is assumed uniform
}

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
  this.state	 	= 0;		//0 - stopped, 1 - moving
  this.behaviours	= [];
  this.pauseBehaviours	= false;
  this.animation 	= 0;

  this.orientation	= new vector( 0, -1 );				//the direction facing movement, not necessarily related to the angle of the object
  this.rotation		= undefined;					//the object describing the rotatory movement
  this.angle 		= Math.PI/180*parseFloat( this.SVGNode.getAttribute( 'rotation' ) ) || 0;	//the angle of rotation for the rendering transformation
  this.speed		= 0;
  this.movementList	= [];
  this.nextMovAction	= { 'add':false , 'replace':false , 'cancel':false , 'nextMovement':undefined };
  this.nextAccAction	= { 'active':true , 'nextValue':0 };


  //PARTS
  this.parts = [];
  var partsGNode = undefined;

    //look for the 'parts' group
    for ( var child = this.group.firstElementChild ; child != null ; child = child.nextElementSibling )
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
	var polyList = this.parts[i].shape.splitPolygon();			//split into a set of concave polygons
	for ( var k = 0 ; k < polyList.length ; k++ )				//add the new concave polygons (beginning)
	  this.parts.unshift( new part( undefined, this, polyList[k] ) );
	this.parts.splice( k, 1 );						//remove the convex polygon
	i = i + polyList.length - 1;						//index to start next iteration at 'same place'
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
  if ( coordinates )
    this.pos = new vector ( coordinates );
  else
  {
    var readX = this.SVGNode.getAttribute( 'x' );		//'SVG coords' are top-left corner
    var readY = this.SVGNode.getAttribute( 'y' );

    if ( readX && readY )
    {
      this.pos = new vector( parseFloat( readX ) + this.width/2, parseFloat( readY ) + this.height/2 );		//if the coordinates are explicitly set in the SVG document
      for ( var i = 0 ; i < this.parts.length ; i++ )
	this.parts[i].pos = this.parts[i].pos.minus( this.width/2, this.height/2 );//set part's positions relative to the element's central position
    }
    else
    {
      this.pos = new vector( maxLeft + this.width/2, maxTop + this.height/2 );	//otherwise, the position is defined by the parts, considered in global coordinates
      for ( var i = 0 ; i < this.parts.length ; i++ )
	this.parts[i].pos = this.parts[i].pos.minus( this.pos.x + this.width/2, this.pos.y + this.height/2 );//set part's positions relative to the element's central position
    }
  }
  //BOUNDING BOX
  this.BBox = new rectangle( this.width, this.height, this.pos, this.angle );
  this.BBox.currentAngle = 0;

  ///ATTRIBUTES
  this.mass = parseFloat( this.SVGNode.getAttribute( 'mass' ) ) || Infinity;
  this.momInertia = this.momentInertia();

  ///CONFIG
  var that = this;
  this.keyHandler = function( event ) { that.key( event ); };
  this.keyStopHandler = function ( event ){ that.keyStop( event ) };

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

function getShape()		//updates the information of the element's bounding box and returns it. The box is never rotated, it just adjusts its dimensions
{
  this.BBox.pos = this.pos;
  if ( this.angle && this.BBox.currentAngle != this.angle )	//if there has been rotation in this frame
  {
    //ADJUSTMENT OF THE BOUNDING BOX ON ROTATION, as the not-rotated b.box that contains the original b.box rotated
    this.BBox.currentAngle = this.angle;	//rotation angle for which it is adapted currently
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
element.prototype.getShape = getShape;
sceneItem.prototype.getShape = getShape;

element.prototype.drawRotation = function( angle )
{
  if ( angle != undefined )
    this.angle = angle;
  this.group.setAttribute( 'transform', 'rotate( ' + this.angle*180/Math.PI + ',' + this.width/2 + ',' + this.height/2 + ')' );
}

element.prototype.angVelocity = function ()
{
  if ( this.rotation )
    return this.rotation.angVelocity;
  else
    return 0;
}

element.prototype.pointVelocity = function( point, angVel )
//returns the velocity component of a given point due to rotation.(Assumed attached to the object)
{
  var d	= point.minus(  this.pos );
  var ang	= d.angle();
  var result	= new vector( -Math.sin( ang ), Math.cos( ang ) );
  angVel	= angVel || this.angVelocity();

  return result.multiply( d.modulus() * angVel );
}

element.prototype.setState = function ( newState, newAnimation )
{
  this.state = newState || 0;				//0 - stopped , 1 - moving
  switch ( this.state )
  {
    case 1 :
      this.animation = newAnimation || 1;
      break;
    default :
      this.animation = newAnimation || 0;
      this.cancelMovements();
      this.cancelRotation();
  }
  if ( newAnimation )
    this.animation = animation;
}

element.prototype.setSelected = function( selected )
{
  if ( selected == undefined )
      selected = true;

  if ( selected && !this.selected )		//here it goes, some closure madness xDDDDD
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
      for ( var i = 0 ; i < selectedList.length ; i++ )
	if ( this === selectedList[i] )
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

function selectElements( option, list )
{
  list = list || elementList;
  if ( option == undefined )
    option = true;
  for ( var i = 0 ; i < list.length ; i++ )
      list[i].setSelected( option );
}

element.prototype.addMovement = function( newMovement )			//add movement next frame
{
  if ( newMovement && newMovement instanceof movement )
  {
    this.nextMovAction.add = true;
    this.nextMovAction.nextMovement = newMovement;
  }
}

element.prototype.replaceMovement = function( newMovement )		//replace movement next frame
{
  if ( newMovement && newMovement instanceof movement )
  {
    this.nextMovAction.replace = true;
    this.nextMovAction.nextMovement = newMovement;
  }
}

element.prototype.cancelMovements = function()				//cancels movements next frame
{
  if ( this.movementList[0] || this.nextMovAction.nextMovement )
    this.nextMovAction.cancel = true;
}

element.prototype.doMovAction = function( cancelAll )				//the instant that it is called, preformed scheduled actions synchronously
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
      if ( this.movementList[0].oriented )
	this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
      this.speed = this.movementList[0].speed || this.speed || baseSpeed;		//use proposed speed, or current speed, or baseSpeed
      this.setState( 1 );	//1 - moving state
    }
    //ADD
    else if ( this.nextMovAction.add )
    {
      this.movementList.push( this.nextMovAction.nextMovement );
      if ( this.movementList.length == 1 && this.movementList[0].oriented )
	this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
      this.speed = this.movementList[0].speed || this.speed || baseSpeed;		//use proposed speed, or current speed, or baseSpeed
      this.setState( 1 );	//1 - moving state
    }
  //HOUSEKEEPING
  this.nextMovAction.cancel	 = false;
  this.nextMovAction.replace	 = false;
  this.nextMovAction.add	 = false;
  this.nextMovAction.nextMovement= undefined;
}

element.prototype.accelerate = function ( acceleration )
{
  this.nextAccAction.nextValue += acceleration || baseAccel;
  this.nextAccAction.active = true;
}

element.prototype.deccelerate = function ( decceleration )
{
  this.accelerate( -( decceleration || baseAccel ) );
}

element.prototype.doAccAction = function()
{
  if ( this.nextAccAction.active )
  {
    var newSpeed = this.speed + this.nextAccAction.nextValue;
    if ( newSpeed < 0 )
      newSpeed = 0;						//this will end and eliminate the movement from the list when move() is invoked
    this.speed = newSpeed;
    this.nextAccAction.nextValue = 0;
  }
}

element.prototype.finishMovement = function()
{
  if ( this.movementList.length > 0 )
  {
    this.movementList.shift();
    if ( this.movementList[0] )
    {
      if ( this.movementList[0].oriented )
	this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
    }
  }
}

element.prototype.cancelRotation = function()				//next frame
{
  if ( this.rotation )
    this.rotation.cancel = true;
}

element.prototype.stop = function()					//cancels all motion INSTANTLY (use with care)
{
  if ( this.nextMovAction.nextMovement )
    this.orientation = new vector ( this.nextMovAction.nextMovement.direction );
  else if ( this.movementList[0] )
    this.orientation = new vector ( this.movementList[0].direction );

  this.doMovAction( true );	//cancel scheduled actions
  this.setState( 0 );	//0 - non-moving state
}

element.prototype.rotate = function( angle )
{
  if ( angle == undefined )
    angle = 5*Math.PI/180;
  this.angle += angle;
  this.angle = angleCheck( this.angle );	//between (-PI , PI]
}

element.prototype.rotateTo = function( angle )			//rotate to the desired angle (shortest way)
{
  if ( angle != undefined )
  {
    angle = angleCheck( angle );
    if ( this.angle != angle && ( !this.rotation || this.rotation && this.rotation.targetAngle != angle ) )
    {
      var incr = angle - this.angle;			//between [-2PI , 2PI]
      if ( ( incr > 0 && Math.abs( incr ) <= Math.PI ) || ( incr < 0 && Math.abs( incr ) > Math.PI ) )
	this.rotation = new rotation( 4*shiftAngle ); 		//turn right
      else
	this.rotation = new rotation( -4*shiftAngle );		//turn left
      this.rotation.targetAngle = angle;		//between [-PI , PI]
    }
  }
}

element.prototype.move = function ()  			//update for each frame, for both movement and rotation
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
	this.pos = this.pos.add( this.movementList[0].advance() );
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
      if ( this.rotation.targetAngle != undefined && Math.abs( this.rotation.targetAngle - this.angle ) < Math.abs( this.rotation.angVelocity ) )
      {
	this.orientation = new vector ( this.rotation.targetAngle );
	this.drawRotation( this.rotation.targetAngle );
	this.rotation = undefined;
      }
      if ( this.rotation && this.rotation.isFinished() )
	this.rotation = undefined;
    }
  }
  //STATUS UPDATE
  if ( ( this.movementList[0] || this.rotation ) && this.state != 1 )
    this.setState( 1 );			//1 - moving state
  else if ( !( this.movementList[0] || this.rotation ) && this.state != 0 )
    this.setState( 0 );			//0 - non-moving state
}

element.prototype.moveTo = function ( destPos, append, curved )		///convenience function to make the element move towards a position, and chain movements
{
  if ( append == undefined )
    append = false;
  if ( curved == undefined )
    curved = false;

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

element.prototype.chase = function ( targetObj/*, accelerating*/, speed )
{
  if ( targetObj instanceof element && targetObj !== this )
    this.replaceMovement( new chaseMovement( this, targetObj, speed ) );
}

element.prototype.flee = function ( targetObj/*, accelerating*/, speed )
{
  if ( targetObj instanceof element && targetObj !== this )
    this.replaceMovement( new fleeMovement( this, targetObj, speed ) );
}

element.prototype.isCloserTo = function( checkPoint, radius )		///check if the element hits a point
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

element.prototype.collisionTrigger = function( obj, collisionInfo )	//executes the reaction to a collision
{
  this.stop();
  //   elasticImpact( collisionInfo.inObj, collisionInfo.outObj, collisionInfo.inPart.getShape().getNormal( collisionInfo.colPt ), collisionInfo.colPt );
//   if ( obj instanceof element )
    //if ( obj.type == "" )	//TODO
//       this.addKeepDistanceBehaviour( obj, 100, 150 );
}

element.prototype.mouse = function( event )
{
  event.preventDefault();
  event.stopPropagation();
  if ( event.ctrlKey )		//TOGGLE SELECTION
  {
    if ( !( selectedList.length == 1 && selectedList[0] === this ) )	//don't de-select the last one
      this.toggleSelected();
  }
  else if( event.shiftKey )	//SELECT ALL
    selectElements();
  else				//SELECT ONLY THIS ELEMENT
  {
    selectElements( false );
    this.setSelected();
  }
}

element.prototype.key = function( event )//TODO break after each?
{
  if ( event.keyCode == 27 ) ///'esc' CANCEL MOVEMENTS
    this.setState( 0 );		//0 - non-moving state

  if ( event.keyCode == 84 ) ///'t' FORWARDS
    this.replaceMovement( new movement( this, this.orientation ) );

  if ( event.keyCode == 71 ) ///'g' BACKWARDS
  {
      this.replaceMovement( new movement( this, this.orientation.multiply( -1 ) ) );
      this.orientation = this.orientation.multiply( -1 );
  }
    ////////////
  if ( event.keyCode == 87 ) ///'w' UP
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'up' );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );

    }
    else
      this.replaceMovement( new arrowMovement( this, 'up' ) );
  }
  else if ( event.keyCode == 83 ) ///'s' DOWN
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'down' );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );

    }
    else
      this.replaceMovement( new arrowMovement( this, 'down' ) );
  }
  if ( event.keyCode == 68 ) ///'d' RIGHT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'right' );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );

    }
    else
      this.replaceMovement( new arrowMovement( this, 'right' ) );
  }
  else if ( event.keyCode == 65 ) ///'a' LEFT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'left' );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
    }
    else
      this.replaceMovement( new arrowMovement( this, 'left' ) );
  }
  ///////////////////////////////////////////////////////////////

  if ( event.keyCode == 73 ) ///'i' ACCELERATE AND BEGIN 'CAR MODE'
  {
    if ( !this.movementList[0] )
      this.addMovement( new carMovement( this, this.orientation ) );
    this.accelerate();
  }
  if ( event.keyCode == 75 ) ///'k' DECCELERATE
    this.deccelerate();

  if ( event.keyCode == 76 || event.keyCode == 72 ) ///'l' STIR RIGHT
  {
    if ( this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 1;
    this.rotation = new rotation( shiftAngle );
  }
  if ( event.keyCode == 74 || event.keyCode == 70  ) ///'j' STIR LEFT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 2;
    this.rotation = new rotation( -shiftAngle );
  }

  if ( event.keyCode == 32 )	///'space' GO RANDOM
  {
    if ( !this.movementList[0] )
    {
      var newMovement = new movement( this, this.orientation, baseSpeed );
      newMovement.randomCurv();
      this.addBasicBehaviour( newMovement );
    }
    else
      this.movementList[0].randomCurv();
    // 	this.movementList[0].randomSpeed();
    //this.movementList[0].randomOrient();
  }
  if ( event.keyCode == 67 )	///'c' ADD CIRCLE COMPONENT
  {
    if ( !this.movementList[0] )
      this.addMovement( new circleMovement( this ) );
    else
      this.movementList[0].components.push( new circleMovement( this ) );
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
	this.rotation.accelerate( shiftAngle );//TODO with states
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
    this.setState ( 0 );		//0 - stopped state
  if ( this.movementList[0] )
  {
    if ( event.keyCode == 87 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'up', false );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
    }
    if ( event.keyCode == 83 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'down', false );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
    }
    if ( event.keyCode == 68 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'right', false );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
    }
    if ( event.keyCode == 65 && this.movementList[0] instanceof arrowMovement )
    {
      this.movementList[0].addDir( 'left', false );
      this.rotateTo( this.movementList[0].direction.angle() - Math.PI/2 );
    }
    if ( event.keyCode == 73 || event.keyCode == 75 )
      this.nextAccAction.active = false;
    if ( (  event.keyCode == 74 || event.keyCode == 76  ) && this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 0;
  }
  if (  event.keyCode == 74  || event.keyCode == 76  || event.keyCode == 70  || event.keyCode == 72 )
    this.rotation = undefined;
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
    if ( this.animation == 1 )		//moving
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
    if ( this.animation == 0 )	//stopped
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
//TODO ordenar
function behaviour( firstState, code, priority )	//object with a variable state that dictates the movement behaviour of the element
{
  if ( firstState == undefined )
    firstState = new BHState()
  this.state = firstState;
  this.priority = priority || 1;//integer number, 1 being the lowest
  this.code = code || 0;
}

element.prototype.setBehaviourPriority = function( value, code )			//set the priority of the behaviour with code 'code' to a 'value'
{
  for ( var j = 0 ; j < this.behaviours.length ; j++ )
    if ( this.behaviours[j].code == code )
    {
      this.behaviours[j].priority = value;
      return true;
    }
  return false;
}

element.prototype.increaseBehaviourPriority = function( code, incr )			//set the priority of the behaviour with code 'code' to a 'value'
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

// function setBehaviourPriority( objList, value, code )			//set the priority of the behaviours with code 'code' to a 'value', for a list of objects
// {
//   objList = objList || elementList;
//   for ( var i = 0 ; i < objList.length ; i++ )
//     objList[i].setBehaviourPriority( value, code );//TODO
// }

function BHState( move )		//state that can contain triggers to other states, and defines a movement
{
  this.triggers = [];
  this.movement = move;	//undefined means no movement
  if ( this.movement )
    this.movement.pauseBehaviours = false;	//mark movement as part of a behaviour
}

function trigger ( testFunction, nextState, priority )	//transition between states, activated by a function according to certain conditions
{
  this.check = testFunction;	//undefined means this trigger will never execute
  this.nextState = nextState;	//undefined means itself
  this.priority = priority || 1;//integer number, 1 being the lowest
}

BHState.prototype.addTrigger = function( testFunction, nextState, priority )	//convenience function to create and add a new trigger for this state
{
  this.triggers.push( new trigger( testFunction, nextState, priority ) );
}

element.prototype.behaviourUpdate = function()		//checks if any trigger needs to be executed and changes the state accordingly
{
  var result = false;
  if ( this.behaviours.length > 0 )
    for ( var j = 0 ; j < this.behaviours.length ; j++ )
    {
      var aTrigger = undefined;
      var maxPriority = -Infinity;
      //LOOK FOR HIGHEST PRIORITY TRIGGER
      for ( var i = 0 ; i < this.behaviours[j].state.triggers.length ; i++ )
	if ( maxPriority < this.behaviours[j].state.triggers[i].priority
	  && this.behaviours[j].state.triggers[i].check != undefined
	  && this.behaviours[j].state.triggers[i].check() == true )
	{
	  aTrigger = this.behaviours[j].state.triggers[i];
	  maxPriority = this.behaviours[j].state.triggers[i].priority;
	  result = true;
	}
      //EXECUTE (first) HIGH PRIORITY TRIGGER
      if ( aTrigger && aTrigger.nextState )		//undefined 'nextState' means the current state is not abandoned
	this.behaviours[j].state = aTrigger.nextState;
    }
  return result;
}

element.prototype.doBehaviour = function()		//executes the new movement if the state changed
{
  if ( ( this.movementList[0] && !this.movementList[0].pauseBehaviours )
    || !this.movementList[0] )	//behaviours should be paused while there are other movements (orders) going on (until they have stopped)
  {
    //SET MOVEMENT IF THE NEW STATE IS TRIGGERED
    var move = false;
    if ( this.behaviourUpdate() )
    {
      for ( var i = 0 ; i < this.behaviours.length ; i++ )
	if ( this.behaviours[i].state.movement )
	{
	  if ( !move )
	    this.replaceMovement( this.behaviours[i].state.movement );
	  else
	  {
	    this.behaviours[i].state.movement.weight = this.behaviours[i].priority;
	    this.nextMovAction.nextMovement.components.push( this.behaviours[i].state.movement );
	  }
	  move = true;
	}
      if ( !move && this.state != 0 )
	this.setState( 0 );
    }
  }
}

element.prototype.addBasicBehaviour = function( move, priority, code )	//creates a one-state behaviour that repeats everytime a movement is finished
{
  var state = new BHState( move );	//create a state with a corresponding movement
  var that = this;
  state.addTrigger( function(){ return that.state == 0 } );		//add a condition to re-initiate the state/movement: if the object is idle
  this.behaviours.push( new behaviour( state, code, priority ) );
}

element.prototype.increaseBasicBehaviour = function( move, code, incr )	//increases priority or creates behaviour
{
  if ( !this.increaseBehaviourPriority( code, incr ) )
    this.addBasicBehaviour( move, undefined, code );
}

// behaviour.prototype.addLoopState = function( state, testFunction )//creates a non-branched, circular behaviour, by adding a state at the end and connecting it to the first
// {
//   state.triggers = [];		//empty triggers
//   var st = this.state;
//   while ( st.triggers[0] && st.triggers[0].nextState !== this.state )		//look for the last state in the chain
//     st = st.triggers[0].nextState;
//   st.triggers[0].nextState = state;						//connect it to the new state
//
//   if ( !testFunction )
//     state.addTrigger( st.triggers[0].check, this.state );	//connect new state to first (and copy last test function)
//   else
//     state.addTrigger( testFunction, this.state );		//TODO test
// }

element.prototype.addKeepDistanceBehaviour = function( target, distance1, distance2, code, priority )//chases the target if it gets too far, and flees from it if it gets too close
{
  code = code || "KD-" + target.id;
  priority = priority || 1;
  distance2 = distance2 || distance1;
  var state0 = new BHState();						//base state - do nothing
  var state1 = new BHState(  new chaseMovement( this, target )  );	//chase target
  var state2 = new BHState(  new  fleeMovement( this, target )  );	//flee from target
  var that = this;
  state0.addTrigger( function() { return !that.isCloserTo( target.pos, distance2 ); }, state1 );		//if too far, chase
  state0.addTrigger( function() { return  that.isCloserTo( target.pos, distance1 ); }, state2 );		//if too close, flee
  state1.addTrigger( function() { return  that.isCloserTo( target.pos, (distance1+distance2)/2 ); }, state0 );	//if close enough, idle
  state2.addTrigger( function() { return !that.isCloserTo( target.pos, (distance1+distance2)/2 ); }, state0 );	//if far enought, idle
  this.behaviours.push( new behaviour( state0 , code, priority ) );
}

element.prototype.increaseKeepDistanceBehaviour = function( target, distance1, distance2, code, incr )	//increases priority or creates behaviour
{
  code = code || "KD-" + target.id;
  if ( !this.increaseBehaviourPriority( code, incr ) )
    this.addKeepDistanceBehaviour( target, distance1, distance2, code );
}

element.prototype.addAvoidBehaviour = function( target, distance, code, priority )	//flees from the target if it gets too close (PRIORITY 3)
{
  code = code || "A-" + target.id;
  priority = priority || 3;
  var state0 = new BHState();	//base state - do nothing
  var state1 = new BHState(  new  fleeMovement( this, target ) );	//flee from target
  var that = this;
  state0.addTrigger( function() { return  that.isCloserTo( target.pos, distance ); }, state1 );	// if too close, flee
  state1.addTrigger( function() { return !that.isCloserTo( target.pos, distance ); }, state0 );	//if far enought, idle
  this.behaviours.push( new behaviour( state0, code, priority ) );
}

element.prototype.increaseAvoidBehaviour = function( target, distance, code, incr )				//increases priority or creates behaviour
{
  code = code || "A-" + target.id;
  if ( !this.increaseBehaviourPriority( code, incr ) )
    this.addAvoidBehaviour( target, distance, code );
}

function cancelBehaviours( objList )
{
  objList = objList || elementList;
  for ( var i = 0 ; i < objList.length ; i++ )
  {
    objList[i].behaviours = [];
    if ( !objList[i].movementList[0].pauseBehaviours )		//cancel movements if they were subject to a behaviour
      objList[i].setState( 0 );			// 0 - non-moving state
  }
}

function avoidTarget ( objList, target, dist, code, priority )	//all elements avoid the 'target'
{
  dist = dist || 75;
  objList = objList || elementList;

  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i] !== target )
      objList[i].increaseAvoidBehaviour( target, dist, code/*, priority*/ );
}

function avoidOthers( objList, dist, code, priority )		//all elements keep at least a distance to the rest
{
  dist = dist || 75;
  objList = objList || elementList;

  for ( var i = 0 ; i < objList.length ; i++ )
    avoidTarget( objList, objList[i] , dist, code/*, priority*/ );
}

function gather ( objList, leader, dist, code, priority )	//all elements gather in a closed formation (optionally, around a 'leader')
{
  code = code || 3;
  dist = dist || 75;
  objList = objList || elementList;
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
      objList[i].increaseBasicBehaviour( new rectMovement( objList[i], center ), code/*, priority*/ );
}

function follow ( objList, leader, dist, code )	//all elements follow the 'leader'
{
  dist = dist || 75;
  objList = objList || elementList;
  objList = objList.slice();

  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i] !== leader )
      objList[i].increaseKeepDistanceBehaviour( leader, dist, dist*1.15, code );
}

function followInLine ( objList, leader, dist, code )	//all elements follow the 'leader' in an ordered row
{
  dist = dist || 75;
  objList = objList || elementList;
  objList = objList.slice();

  //REMOVE THE 'LEADER' FROM THE LIST
  for ( var i = 0 ; i < objList.length ; i++ )
    if ( objList[i] === leader )
      objList.splice( i, 1 );

  for ( var i = 0 ; objList.length > 0 ; i++ )
  {
    //LOOK FOR THE CLOSEST ELEMENT AND MAKE IT CHASE THE LEADER
    var index 	= 0;
    var minDist	= Infinity;
    for ( var j = 0 ; j < objList.length ; j++ )
    {
      var distance = leader.pos.minus( objList[j].pos ).modulus();
      if ( distance < minDist )
      {
	minDist = distance;
	index = j;
      }
    }
    //MAKE THIS ELEMENT THE NEW LEADER FOR THE REST
    objList[index].increaseKeepDistanceBehaviour( leader, dist, dist*1.15, code );
    leader = objList[index];
    objList.splice( index, 1 );
  }
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function keyDown( event )
{
  event.preventDefault();
  if ( event.keyCode == 49 ) //'1'
  {
    selectElements( false );
    if ( elementList[0] )
    {
      elementList[0].setSelected( true );
      scene.focus( elementList[0] );
    }
  }
  if ( event.keyCode == 50 ) //'2'
  {
    selectElements( false );
    if ( elementList[1] )
    {
      elementList[1].setSelected( true );
      scene.focus( elementList[1] );
    }
  }
  if ( event.keyCode == 51 ) //'3'
  {
    selectElements( false );
    if ( elementList[2] )
    {
      elementList[2].setSelected( true );
      scene.focus( elementList[2] );
    }
  }
  if ( event.keyCode == 52 ) //'4'
  {
    selectElements( false );
    if ( elementList[3] )
    {
      elementList[3].setSelected( true );
      scene.focus( elementList[3] );
    }
  }
  if ( event.keyCode == 53 ) //'5'
  {
    selectElements( false );
    if ( elementList[4] )
    {
      elementList[4].setSelected( true );
      scene.focus( elementList[4] );
    }
  }
  if ( event.keyCode == 54 ) //'6'
  {
    selectElements( false );
    if ( elementList[5] )
    {
      elementList[5].setSelected( true );
      scene.focus( elementList[5] );
    }
  }
  if ( event.keyCode == 55 ) //'7'
  {
    selectElements( false );
    if ( elementList[6] )
    {
      elementList[6].setSelected( true );
      scene.focus( elementList[6] );
    }
  }
  if ( event.keyCode == 56 ) //'8'
  {
    selectElements( false );
    if ( elementList[7] )
    {
      elementList[7].setSelected( true );
      scene.focus( elementList[7] );
    }
  }
  if ( event.keyCode == 57 ) //'9'
  {
    selectElements( false );
    if ( elementList[8] )
    {
      elementList[8].setSelected( true );
      scene.focus( elementList[8] );
    }
  }
  if ( event.keyCode == 48 ) //'0'
    selectElements( true );

//   if ( event.keyCode == 13 )	///'enter' FOLLOW
//   {
//     avoidOthers( selectedList );
//     if ( !event.shiftKey )
//       followInLine( selectedList, elementList[1] );
//     else
//       follow( selectedList, elementList[1] );
//     gather( selectedList/*, elementList[1]*/ );
//   }

  //////////////// BEHAVIOURS \\\\\\\\\\\\\\\\\\\\
  if ( event.keyCode == 96 )		// KP_0
    avoidOthers( selectedList );

  if ( event.keyCode == 97 )		// KP_1
    followInLine( selectedList, elementList[1] );

  if ( event.keyCode == 98 )		// KP_2
    follow( selectedList, elementList[1] );

  if ( event.keyCode == 99 )		// KP_3
    gather( selectedList );

  if ( event.keyCode == 100 )		// KP_4
    gather( selectedList, elementList[1] );

  if ( event.keyCode == 110 )		// KP_DEL
    cancelBehaviours( selectedList );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function sceneItem( id )		//Non only decorative item that is part of the scenery, defined by one or more different 'parts'
{
  if ( !id ) return;
  this.SVGNode = document.getElementById( id );
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'type' ) || 'solid';		//describes the 'role' of the item in with element's interaction

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

    //divide convex polygons into simple concave polygon 'parts'
    for ( var i = 0 ; i < this.parts.length ; i++ )
      if ( this.parts[i].shape instanceof polygon && this.parts[i].shape.isConvex() )
      {
	var polyList = this.parts[i].shape.splitPolygon();			//split into a set of concave polygons
	for ( var k = 0 ; k < polyList.length ; k++ )				//add the new concave polygons (beginning)
	  this.parts.unshift( new part( undefined, this, polyList[k] ) );
	this.parts.splice( k, 1 );						//remove the convex polygon
	i = i + polyList.length - 1;						//index to start next iteration at 'same place'
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
  var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || maxLeft;		//'SVG coords' are top-left corners
  var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || maxTop ;
  this.pos = new vector( readX + this.width/2, readY + this.height/2 );			//center of the object
  this.BBox = new rectangle( this.width, this.height, this.pos );
  this.BBox.currentAngle = 0;

  //set part's positions relative to the element position
  for ( var i = 0 ; i < this.parts.length ; i++ )
    this.parts[i].pos = this.parts[i].pos.minus( this.pos );
}

sceneItem.prototype.collisionTrigger = function( obj, collisionInfo )	//executes the reaction to a collision
{}

function map( id, viewBoxCoords, viewBoxSizeX, viewBoxSizeY ) ///coordinates are CENTER of the view box
{
  if ( !id ) return;
  this.SVGNode = document.getElementById( id );
  this.worldSVGNode = this.SVGNode.parentNode;		//the 'map'SVG receives events and its parent manages zoom,pan.. because the parent contains all the elements
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'map' );
  this.worldSVGNode.setAttribute( 'x', 0 );
  this.worldSVGNode.setAttribute( 'y', 0 );
  this.worldSVGNode.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );  ///keep aspect ratio when stretching
  this.worldSVGNode.setAttribute( 'overflow' , 'visible' );

  //INITIALIZE ALL SOLID ELEMENTS
  var sceneItemsGNode = undefined;
  this.sceneItems = [];
  for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    if ( child.nodeName == 'g' && child.getAttribute( 'id' ) == 'sceneItems' )
      sceneItemsGNode = child;
  if ( sceneItemsGNode )
    for ( var child = sceneItemsGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.sceneItems.push( new sceneItem( child.getAttribute( 'id' ) ) );

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

  this.mapSizeX = this.worldSVGNode.getAttribute( 'width' )-0;			///Get the original dimensions, these are PROPORTIONAL to the REAL drawing.
  this.mapSizeY = this.worldSVGNode.getAttribute( 'height' )-0;			///Use these for boundary checks.

  if ( !this.mapSizeX || this.mapSizeX == '100%' )				///Just in case, but the boundary checks won't work properly if these dimensions
    this.mapSizeX = window.innerWidth;					///are not set from the SVG document
  if ( !this.mapSizeY || this.mapSizeY == '100%' )
    this.mapSizeY = window.innerHeight;

  this.worldSVGNode.setAttribute( 'width', window.innerWidth );			///Adjust the drawing to the screen.
  this.worldSVGNode.setAttribute( 'height',window.innerHeight );			///One of these dimensions will NOT be proportional to the drawing.

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
    var params = this.worldSVGNode.getAttribute( 'viewBox' );
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

  ///SET EVENTS
  var that = this;
  this.keyHandler 	 = function ( event ){ that.keyDown( event ) 	};
  this.keyStopHandler 	 = function ( event ){ that.keyStop( event ) 	};
  this.mouseDownHandler  = function ( event ){ that.mouseDown( event ) 	};
  this.mouseClickHandler = function ( event ){ that.mouseClick( event ) };
  this.wheelHandler	 = function ( event ){ that.wheel( event ) 	};


  document.addEventListener	( 'keydown',		this.keyHandler , 	false );
  document.addEventListener	( 'keyup', 		this.keyStopHandler, 	false );
  this.SVGNode.addEventListener	( 'mousedown',		this.mouseDownHandler, 	false );
  this.SVGNode.addEventListener	( 'click',		this.mouseClickHandler ,false );
  this.SVGNode.addEventListener	( 'DOMMouseScroll',	this.wheelHandler,	false );
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
    this.worldSVGNode.setAttribute( 'viewBox',
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
      this.scroll = new vector( pos );
    else if ( this.followedObj instanceof element )
      this.scroll = new vector( this.followedObj.pos );

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
      this.scroll = new vector( pos );
    else if ( this.followedObj instanceof element )
      this.scroll = new vector( this.followedObj.pos );

    this.setViewBox();
  }
}

map.prototype.zoom = function ( newPoint, newSizeX, newSizeY )	///set camera to this position if parameters, perform zoomState otherwise.
{
  if( newPoint )
    this.setViewBox( newPoint, newSizeX, newSizeY );
  else if ( this.zoomState == 1 )
    this.zoomIn();
  else if ( this.zoomState == 2 )
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
  var level = level || 5;
  this.setViewBox( object.pos, object.width*level, object.height*level );
}

map.prototype.pan = function( dirX, dirY )
{
  if ( !this.followedObj )
  {
    dirX =  dirX || this.panRightLeft;
    dirY =  dirY || this.panUpDown;

    if ( dirY == 'down' )
      this.scroll.y += this.viewBoxHeight/panSteps;
    else if ( dirY == 'up' )
      this.scroll.y -= this.viewBoxHeight/panSteps;

    if ( dirX == 'right' )
      this.scroll.x += this.viewBoxWidth/panSteps;
    else if ( dirX == 'left' )
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

map.prototype.keyDown = function ( event )
{
  if ( event.keyCode == 40 && this.scroll.y + this.viewBoxHeight/2 <= this.mapSizeY )	///down
    this.panUpDown = 2;
  if ( event.keyCode == 38 && this.scroll.y >= this.viewBoxHeight/2		)	///up
    this.panUpDown = 1;
  if ( event.keyCode == 39 && this.scroll.x + this.viewBoxWidth/2<= this.mapSizeX ) 	///right
    this.panRightLeft = 1;
  if ( event.keyCode == 37 && this.scroll.x >= this.viewBoxWidth/2		) 	///left
    this.panRightLeft = 2;

  if ( event.keyCode == 34 )		 ///PG_DOWN ZOOM IN
    this.zoomState = 1;
  if ( event.keyCode == 33 )		 ///PG_UP ZOOM OUT
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

map.prototype.mouseClick = function ( event )	//move selected elements to the map position
{
  event.preventDefault();
  event.stopPropagation();
  var screenCoords = new vector( event.clientX, event.clientY );

  if ( event.button == '0' ) //left button
    for ( var i = 0 ; i < elementList.length ; i++ )
      if ( elementList[i].selected )
	elementList[i].moveTo( this.fromScreen( screenCoords ) , event.shiftKey, event.ctrlKey );
}

map.prototype.mouseDown = function ( event )
{
  event.preventDefault();
  event.stopPropagation();
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
  event.preventDefault();
  event.stopPropagation();
  if ( event.button == '0' ) //left button
  {
    selectBox.unDraw();
    //BOX-SELECT, if dragging has occured
    if ( selectBox.width != 0 && selectBox.height != 0 )
    {
      //Make a list with the elements inside the box
      var rect = selectBox.getMapRectangle();
      var list = [];
      for ( var i = 0 ; i < elementList.length ; i++ )
	if ( overlapPoints( elementList[i], rect ) )
	  list.push( elementList[i] );

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

map.prototype.mouseMove = function ( event )	//move camera when cursor is close to border
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
    if ( this.followedObj instanceof element ) ///element selected, zoom to element position
    {
      if ( event.detail < 0 )
	this.zoomIn( this.followedObj.getPosition() );
      else
	this.zoomOut( this.followedObj.getPosition() );
    }
    else					/// zoom to mouse position
    {
      var aux = new vector( this.viewBoxWidth, this.viewBoxHeight );
      aux = aux.multiply( ( this.zoomFactor - 1 )/2 );

      var aux2 = new vector ( event.clientX*this.viewBoxWidth/window.innerWidth, event.clientY*this.viewBoxHeight/window.innerHeight );
      aux2 = aux2.multiply( 1 - this.zoomFactor );

      if ( event.detail < 0 )
	this.zoomIn( this.scroll.add( aux ).add( aux2 ) );
      else
	this.zoomOut( this.scroll.minus( aux ).minus( aux2 ) );
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function selectionBox()
{
  this.SVGNode = document.createElementNS( 'http://www.w3.org/2000/svg', 'rect' );
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
  document.addEventListener( 'mousemove', scene.mouseMove, false );	//no closure needed here
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

function panel( id )//TODO
{
      if ( !id ) return;
      this.SVGNode = document.getElementById( id );
      this.id = id;
      this.type = this.SVGNode.getAttribute( 'panel' );
//       this.SVGNode.setAttribute( 'x', 0 );
  this.SVGNode.setAttribute( 'overflow' , 'visible' );
}


/////////////////////////////////////////////////////////////////////////////////////////////////