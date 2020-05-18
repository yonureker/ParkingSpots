// Idea 1: Calculate the distance between users address and each data point.
// Problem: What if we had 1 million data points? Comparing users address to every single data point is inefficient.

// Idea 2: Until you reach x number of nearby locations, scan user adress'
// neighboring 12-digit-geohashes within a certain radius and check if it is included in any data points.
// Problem: We have to scan hundreds of thousands 12-digit-geohashes as each of them only covers 3cm X 3cm area.

// Idea 3: Group all data points with their 7-digit geohash substring. Do Idea 2 with 7-digit-geohashes.

// ----------

// Need to access geohash in an efficient way. Conversion of data to object?

const proximityhash = require("proximityhash"); // to find neighboring geohashes to user address
const ngeohash = require("ngeohash"); // to decode & encode geohashes
const geohashDistance = require("geohash-distance"); // to calculate distance between two geohashes

// import sample data set.
// 100k points in '9q8' boundary box.
const sf = require("./data2.js");

class City {
  /* The constructor takes in a list of data points representing the city, 
	where each data point takes the form (12-digit-geohash, curb_designation). 
	Store this data inside the class and perform any other work you need to do 
	for the other two methods in this class. Your goal here is to store the data 
	in a format that makes your search function accurate and time efficient.
  */

  /* data example:
  [ {geohash: 'nz1dvwc67kxx', curb_designation: 8
    {geohash: '9q8yykvq6nhv', curb_designation: 6
  ]
  */

  constructor(data) {
    this.hashPrecision = 1; // this is the length of the hash we will group all data points
    this.data = {};

    // check each datapoint and group them by their 7-level geohash substring
    data.map((dataPoint) => {
      const geohash = dataPoint["geohash"];
      const curbDesignation = dataPoint["curb_designation"];
      const slicedGeohash = geohash.slice(0, this.hashPrecision);

      if (this.data.hasOwnProperty(slicedGeohash)) {
        this.data[slicedGeohash][geohash] = curbDesignation;
      } else {
        this.data[slicedGeohash] = {};
        this.data[slicedGeohash][geohash] = curbDesignation;
      }
    });
  }

  /* @params: address-the user's entered dropoff address’s 12-digit-geohash
	This method should search around “address” for the best curb spaces available. 
	@returns: array of top 10 curb spaces close to passed address (as mentioned above, 
	you’ll need to design a metric which takes into account (a) distance from address 
	and (b) curb_designation value.
	*/
  search(address) {
    // I set the maximum walking distance to 0.4 miles ~ 600 metres for demonstration purposes.
    // This can be configured in findNeighbors function.

    const neighborList = this.findNeighbors(address); // find geohash neighbors of user address in a 600 meter radius
    const matchingSpots = []; // we will add matching curb spots within the radius and sort later.

    // check each 7-level geohash in the neighborList.
    // if checked geohash is included in this.data keys, add geohash and curbscore to matchingSpots array.
    neighborList.forEach((geohash) => {
      if (this.data[geohash]) {
        for (const key in this.data[geohash]) {
          matchingSpots.push({
            geohash: key,
            curbScore: this.calculateCurbScore(
              address,
              key,
              this.data[geohash][key]
            ),
          });
        }
      }
    });

    // sort spots by curb score
    const topSpots = matchingSpots.sort((a, b) => b.curbScore - a.curbScore);

    // filter spots with 0 score and return top 10.
    const filteredTopSpots = topSpots.filter(elem => elem.curbScore !== 0).slice(0,10)

    console.log(filteredTopSpots);
  }

  /* params: location -- a well-formed input (12-digit-geohash, curb_designation). 
	Update should take this information and update the data structure you initialized 
	in the City constructor. This function will either update the curb_designation 
	for an existing data point, or will insert a new data point. As an example, 
	imagine a user reports that a parking spot now has a hydrant. 
	returns: void
  */

  // input example
  // {geohash: '9q8yyqr3h670', curb_designation: '9'}

  update(location) {
    // this is actually the same function for dataPoint to object conversion
    const geohash = location["geohash"]; // '9q8yyqr3h670'
    const curbDesignation = location["curb_designation"]; // 9
    const slicedGeohash = geohash.slice(0, this.hashPrecision);

    if (this.data.hasOwnProperty(slicedGeohash)) {
      this.data[slicedGeohash][geohash] = curbDesignation;
    } else {
      this.data[slicedGeohash] = {};
      this.data[slicedGeohash][geohash] = curbDesignation;
    }
  }


  // helper functions

  calculateCurbScore(userAddress, curbSpot, curbDesignation) {
    // these can be configured by looking at collected user data. setting at 1:1 for now.
    const distanceWeight = 1;
    const curbDesignationWeight = 1;

    // if userAddress is equal to a curbspot geohash, set distance to close to 0; but not 0.
    const distance =
      userAddress === curbSpot
        ? 0.00001
        : geohashDistance.inKm(userAddress, curbSpot);

    const curbScore =
      (curbDesignation * curbDesignationWeight) / (distance * distanceWeight);

    return curbScore;
  }

  findNeighbors(address) {
    // configuration object for proximityhash
    const options = {
      latitude: ngeohash.decode(address).latitude,
      longitude: ngeohash.decode(address).longitude,
      radius: 500, // in meters
      precision: this.hashPrecision,
      georaptorFlag: true,
    };

    const neighborList = proximityhash.createGeohashes(options);

    return neighborList;
  }
}

// initialize city
let sanFrancisco = new City(sf.data2);

// searching a geohash
sanFrancisco.search("9q8ytwheyxsh"); // Twin Peaks

