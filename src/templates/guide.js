import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TOC from '../components/TOC';
import GuideSection from '../components/GuideSection';
import GuideHeading from '../components/GuideHeading';
import Widgets from '../components/Widgets/Widgets';
import { LANGUAGES, DEPLOYMENTS, SECTION_NAME_MAPPING } from '../constants';
import { getLocalValue, setLocalValue } from '../browserStorage';
import { findKeyValuePair, getPrefix, throttle } from '../util';

export default class Guide extends Component {
  constructor(propsFromServer) {
    super(propsFromServer);

    const { pageContext } = this.props;
    let guideKeyInMapping = this.props['*']; // eslint-disable-line react/destructuring-assignment

    // get correct lookup key based on whether running dev/prod
    if (process.env.NODE_ENV === 'production') {
      const documentPrefix = getPrefix().substr(1);
      guideKeyInMapping = guideKeyInMapping.replace(`${documentPrefix}/`, '');
    }

    // get data from server
    this.sections = pageContext.__refDocMapping[guideKeyInMapping].ast.children[0].children;
    this.bodySections = this.sections.filter(section => Object.keys(SECTION_NAME_MAPPING).includes(section.name));

    this.state = {
      activeTabs: {},
      activeSection: this.bodySections[0].name,
    };

    this.sectionRefs = this.bodySections.map(() => React.createRef());
  }

  componentDidMount() {
    document.addEventListener('scroll', throttle(this.recalculate, 150));
  }

  recalculate = () => {
    const height = document.body.clientHeight - window.innerHeight;
    const headings = this.sectionRefs.map((ref, index) => [ref, this.bodySections[index].name]);

    // This is a bit hacky, but it mostly works. Choose our current
    // position in the page as a decimal in the range [0, 1], adding
    // our window size multiplied by 80% of the unadjusted [0, 1]
    // position.
    // The 80% is necessary because the last sections of a guide tend to
    // be shorter, and we need to make sure that scrolling to the bottom
    // highlights the last section.
    const scrollTop = Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop);
    let currentPosition = scrollTop / height;
    currentPosition = (scrollTop + currentPosition * 0.8 * window.innerHeight) / height;

    let bestMatch = [Infinity, null];

    headings.forEach(([headingRef, sectionName]) => {
      const headingPosition = headingRef.current.offsetTop / height;
      const delta = Math.abs(headingPosition - currentPosition);
      if (delta <= bestMatch[0]) {
        bestMatch = [delta, sectionName];
      }
    });

    this.setState({ activeSection: bestMatch[1] });
  };

  addTabset = (tabsetName, tabData) => {
    let tabs = tabData.map(tab => tab.argument[0].value);
    if (tabsetName === 'cloud') {
      tabs = DEPLOYMENTS.filter(tab => tabs.includes(tab));
      this.setNamedTabData(tabsetName, tabs, DEPLOYMENTS);
    } else if (tabsetName === 'drivers') {
      tabs = LANGUAGES.filter(tab => tabs.includes(tab));
      this.setNamedTabData(tabsetName, tabs, LANGUAGES);
    } else {
      this.setActiveTab(getLocalValue(tabsetName) || tabs[0], tabsetName);
    }
  };

  matchArraySorting = (tabs, referenceArray) => referenceArray.filter(t => tabs.includes(t));

  setNamedTabData = (tabsetName, tabs, constants) => {
    this.setState(
      prevState => ({
        [tabsetName]: this.matchArraySorting(
          Array.from(new Set([...(prevState[tabsetName] || []), ...tabs])),
          constants
        ),
      }),
      () => this.setActiveTab(getLocalValue(tabsetName) || tabs[0], tabsetName)
    );
  };

  setActiveTab = (value, tabsetName) => {
    const { [tabsetName]: tabs } = this.state;
    let activeTab = value;
    if (tabs && !tabs.includes(value)) {
      activeTab = tabs[0];
    }
    this.setState(prevState => ({
      activeTabs: {
        ...prevState.activeTabs,
        [tabsetName]: activeTab,
      },
    }));
    setLocalValue(tabsetName, activeTab);
  };

  createSections() {
    const { pageContext } = this.props;
    const { activeTabs } = this.state;
    return this.bodySections.map((section, index) => {
      return (
        <GuideSection
          guideSectionData={section}
          key={index}
          headingRef={this.sectionRefs[index]}
          refDocMapping={pageContext ? pageContext.__refDocMapping : {}}
          setActiveTab={this.setActiveTab}
          addTabset={this.addTabset}
          activeTabs={activeTabs}
        />
      );
    });
  }

  render() {
    const { pageContext } = this.props;
    const { activeSection, activeTabs, cloud, drivers } = this.state;
    const pageSlug = this.props['*']; // eslint-disable-line react/destructuring-assignment

    return (
      <div className="content">
        <TOC activeSection={activeSection} sectionKeys={this.bodySections.map(section => section.name)} />
        <div className="left-nav-space" />
        <div id="main-column" className="main-column">
          <div className="body" data-pagename={pageSlug}>
            <ul className="breadcrumbs">
              <li className="breadcrumbs__bc">
                <a href="/">MongoDB Guides</a> &gt;{' '}
              </li>
            </ul>
            <GuideHeading
              activeTabs={activeTabs}
              author={findKeyValuePair(this.sections, 'name', 'author')}
              cloud={cloud}
              description={findKeyValuePair(this.sections, 'name', 'result_description')}
              drivers={drivers}
              refDocMapping={pageContext ? pageContext.__refDocMapping : {}}
              setActiveTab={this.setActiveTab}
              time={findKeyValuePair(this.sections, 'name', 'time')}
              title={findKeyValuePair(this.sections, 'type', 'heading')}
            />
            {this.createSections()}
            <div className="footer">
              <div className="copyright">
                <p>
                  © MongoDB, Inc 2008-present. MongoDB, Mongo, and the leaf logo are registered trademarks of MongoDB,
                  Inc.
                </p>
              </div>
            </div>
          </div>
        </div>
        <Widgets guideName={pageSlug} project={process.env.GATSBY_SITE} />
      </div>
    );
  }
}

Guide.propTypes = {
  '*': PropTypes.string.isRequired,
  pageContext: PropTypes.shape({
    __refDocMapping: PropTypes.objectOf(PropTypes.object).isRequired,
  }).isRequired,
};